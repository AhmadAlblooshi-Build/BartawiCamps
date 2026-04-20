import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = express.Router();

// SaaS tenant ID for Bartawi (loaded from env or fallback to known UUID)
const BARTAWI_TENANT_ID = process.env.BARTAWI_TENANT_ID || 'a17e9d40-a011-a14e-0b0e-67b0a0dbc71f';

// Version-agnostic UUID validation (accepts v1/v4/v5/v7)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Validation Schemas ----------

const CreatePaymentSchema = z.object({
  lease_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
  monthly_record_id: z.string().nullable().optional(),  // Relaxed: DB has non-v4 UUIDs
  target_month: z.coerce.number().int().min(1).max(12).optional(),  // For materialization
  target_year: z.coerce.number().int().min(2024).max(2030).optional(),  // For materialization
  amount: z.coerce.number().positive(),  // Defensive: accepts string or number, coerces to number
  payment_date: z.string(),  // ISO date YYYY-MM-DD
  method: z.enum(['cash', 'cheque', 'bank_transfer', 'card', 'other']),
  payment_type: z.enum(['rent', 'deposit', 'credit', 'adjustment']).default('rent'),

  cheque_number: z.string().optional().nullable(),
  cheque_bank: z.string().optional().nullable(),
  cheque_date: z.string().optional().nullable(),

  transfer_reference: z.string().optional().nullable(),
  transfer_bank: z.string().optional().nullable(),

  notes: z.string().optional().nullable(),
});

const ReverseSchema = z.object({
  reason: z.string().min(3),
});

// ---------- POST /lease-payments — Create payment with transactional integrity ----------

router.post('/', async (req, res) => {
  const parsed = CreatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parsed.error.issues });
  }
  const data = parsed.data;
  const user = req.user;  // Set by auth middleware if present

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch lease with tenant and room context
      const lease = await tx.leases.findUnique({
        where: { id: data.lease_id },
        include: { tenant: true, room: true },
      });
      if (!lease) throw { code: 404, msg: 'lease_not_found' };

      // Method-specific validation
      if (data.method === 'cheque' && !data.cheque_number) {
        throw { code: 400, msg: 'cheque_number_required' };
      }
      if (data.method === 'bank_transfer' && !data.transfer_reference) {
        throw { code: 400, msg: 'transfer_reference_required' };
      }

      // Materialize monthly_record if needed (rent payment with no record)
      if (data.payment_type === 'rent' && !data.monthly_record_id) {
        if (!data.target_month || !data.target_year) {
          throw { code: 400, msg: 'rent_needs_record_or_target_month' };
        }

        // Check if record already exists (race condition guard)
        let record = await tx.monthly_records.findFirst({
          where: {
            lease_id: data.lease_id,
            month: data.target_month,
            year: data.target_year,
          },
        });

        if (!record) {
          // Create new monthly_record (standalone month - no carry-forward)
          record = await tx.monthly_records.create({
            data: {
              // Core fields (SaaS scoping via camp_id → camps.tenant_id)
              room_id: lease.room_id,
              camp_id: lease.room.camp_id,
              lease_id: lease.id,
              room_tenant_id: lease.room_tenant_id,
              month: data.target_month,
              year: data.target_year,
              rent: Number(lease.monthly_rent),
              paid: 0,

              // Tenant info (copied from lease)
              owner_name: lease.tenant?.full_name || null,
              company_name: lease.tenant?.company_name || null,

              // Contract info
              contract_type: lease.contract_type,
              contract_start_date: lease.start_date,
              contract_end_date: lease.end_date,

              // Optional fields with defaults
              people_count: null,
              off_days: 0,
              remarks: null,
              is_locked: false,
            },
          });
        }

        data.monthly_record_id = record.id;  // use it for the rest of the handler
      }

      // Rent payment — attach to monthly_record, update paid
      if (data.payment_type === 'rent') {
        if (!data.monthly_record_id) {
          throw { code: 400, msg: 'monthly_record_required_for_rent' };
        }

        const record = await tx.monthly_records.findUnique({
          where: { id: data.monthly_record_id },
        });
        if (!record) throw { code: 404, msg: 'monthly_record_not_found' };
        if (record.lease_id !== data.lease_id) {
          throw { code: 400, msg: 'lease_record_mismatch' };
        }

        const currentPaid = Number(record.paid);
        const rent = Number(record.rent);
        const newPaid = currentPaid + data.amount;

        if (newPaid > rent) {
          throw {
            code: 400,
            msg: 'overpayment_not_allowed',
            max_allowed: rent - currentPaid
          };
        }

        await tx.monthly_records.update({
          where: { id: record.id },
          data: { paid: newPaid },
          // balance is a generated column — recomputes automatically
        });
      }

      // Deposit payment — update lease.deposit_paid
      if (data.payment_type === 'deposit') {
        const newDepositPaid = Number(lease.deposit_paid) + data.amount;
        if (newDepositPaid > Number(lease.deposit_amount)) {
          throw {
            code: 400,
            msg: 'deposit_overpayment',
            max_allowed: Number(lease.deposit_amount) - Number(lease.deposit_paid),
          };
        }
        await tx.leases.update({
          where: { id: lease.id },
          data: { deposit_paid: newDepositPaid },
        });
      }

      // Create payment row with SaaS scoping
      const payment = await tx.lease_payments.create({
        data: {
          tenant_id: BARTAWI_TENANT_ID,  // SaaS multi-tenancy
          lease_id: data.lease_id,
          monthly_record_id: data.monthly_record_id || null,
          amount: data.amount,
          payment_date: new Date(data.payment_date + 'T00:00:00Z'),
          method: data.method,
          payment_type: data.payment_type,
          cheque_number: data.cheque_number || null,
          cheque_bank: data.cheque_bank || null,
          cheque_date: data.cheque_date ? new Date(data.cheque_date + 'T00:00:00Z') : null,
          transfer_reference: data.transfer_reference || null,
          transfer_bank: data.transfer_bank || null,
          notes: data.notes || null,
          logged_by_user_id: user?.id || null,
          logged_by_name: user?.full_name || user?.name || 'Unknown',
        },
      });

      return payment;
    });

    return res.status(201).json({ payment: result });
  } catch (err) {
    if (err.code && err.msg) {
      return res.status(err.code).json({ error: err.msg, ...err });
    }
    console.error('Payment creation failed:', err);
    return res.status(500).json({ error: 'payment_failed', message: err?.message });
  }
});

// ---------- POST /lease-payments/:id/reverse — Soft delete with reversal tracking ----------

router.post('/:id/reverse', async (req, res) => {
  const parsed = ReverseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const user = req.user;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.lease_payments.findUnique({
        where: { id: req.params.id }
      });
      if (!p) throw { code: 404, msg: 'payment_not_found' };
      if (p.reversed) throw { code: 409, msg: 'already_reversed' };

      // Reduce paid on monthly_record if rent payment
      if (p.payment_type === 'rent' && p.monthly_record_id) {
        const record = await tx.monthly_records.findUnique({
          where: { id: p.monthly_record_id }
        });
        if (record) {
          const newPaid = Math.max(0, Number(record.paid) - Number(p.amount));
          await tx.monthly_records.update({
            where: { id: record.id },
            data: { paid: newPaid },
          });
        }
      }

      // Reduce deposit_paid on lease if deposit
      if (p.payment_type === 'deposit') {
        const lease = await tx.leases.findUnique({
          where: { id: p.lease_id }
        });
        if (lease) {
          await tx.leases.update({
            where: { id: lease.id },
            data: {
              deposit_paid: Math.max(0, Number(lease.deposit_paid) - Number(p.amount))
            },
          });
        }
      }

      return tx.lease_payments.update({
        where: { id: p.id },
        data: {
          reversed: true,
          reversed_at: new Date(),
          reversed_by_name: user?.full_name || user?.name || 'Unknown',
          reversed_reason: parsed.data.reason,
        },
      });
    });

    return res.json({ payment: result });
  } catch (err) {
    if (err.code && err.msg) {
      return res.status(err.code).json({ error: err.msg });
    }
    console.error('Reverse failed:', err);
    return res.status(500).json({ error: 'reverse_failed' });
  }
});

// ---------- GET /lease-payments/lease/:leaseId — Payment history for lease ----------

router.get('/lease/:leaseId', async (req, res) => {
  try {
    const payments = await prisma.lease_payments.findMany({
      where: { lease_id: req.params.leaseId },
      orderBy: [{ payment_date: 'desc' }, { logged_at: 'desc' }],
    });
    res.json({ payments: payments.map(serializePayment) });
  } catch (err) {
    console.error('Lease payments fetch failed:', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// ---------- GET /lease-payments/tenant/:tenantId — All payments for room_tenant ----------

router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const payments = await prisma.lease_payments.findMany({
      where: {
        lease: { room_tenant_id: req.params.tenantId }
      },
      include: {
        lease: {
          include: {
            room: {
              include: { block: true }
            }
          }
        }
      },
      orderBy: [{ payment_date: 'desc' }, { logged_at: 'desc' }],
    });

    res.json({
      payments: payments.map(p => ({
        ...serializePayment(p),
        room_number: p.lease?.room?.room_number,
        block_code: p.lease?.room?.block?.code,
      })),
    });
  } catch (err) {
    console.error('Tenant payments fetch failed:', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// ---------- Helper: Serialize payment for API response ----------

function serializePayment(p) {
  return {
    id: p.id,
    lease_id: p.lease_id,
    monthly_record_id: p.monthly_record_id,
    amount: Number(p.amount),
    payment_date: p.payment_date,
    method: p.method,
    payment_type: p.payment_type,
    cheque_number: p.cheque_number,
    cheque_bank: p.cheque_bank,
    cheque_date: p.cheque_date,
    transfer_reference: p.transfer_reference,
    transfer_bank: p.transfer_bank,
    notes: p.notes,
    logged_by_name: p.logged_by_name,
    logged_at: p.logged_at,
    reversed: p.reversed,
    reversed_at: p.reversed_at,
    reversed_reason: p.reversed_reason,
  };
}

export default router;
