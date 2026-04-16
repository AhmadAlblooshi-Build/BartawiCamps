import express from 'express';
import Decimal from 'decimal.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';
import { collectDepositSchema, refundDepositSchema } from '../schemas/deposits.js';
import logger from '../lib/logger.js';
import { paginate } from '../lib/paginate.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/deposits
 * List deposits with filters and cursor pagination
 */
router.get('/', requirePermission('deposits.read'), async (req, res, next) => {
  try {
    const { status, camp_id, room_id, cursor, limit } = req.query;

    const where = {
      tenant_id: req.tenantId,
      ...(status && { status }),
      ...(camp_id && { camp_id }),
      ...(room_id && { room_id }),
    };

    const result = await paginate(
      prisma.security_deposits,
      where,
      {
        cursor,
        limit: limit ? parseInt(limit) : 50,
        orderBy: { created_at: 'desc' },
        include: {
          rooms: { select: { room_number: true } },
          camps: { select: { name: true } },
          contracts: { select: { id: true } },
          room_occupancy: { select: { id: true } },
        },
      }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/deposits/:id
 * Get single deposit with full details
 */
router.get('/:id', requirePermission('deposits.read'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const deposit = await prisma.security_deposits.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
      include: {
        rooms: { select: { room_number: true, id: true } },
        camps: { select: { name: true, id: true } },
        contracts: { select: { id: true, contract_type: true } },
        room_occupancy: { select: { id: true, check_in_date: true } },
        individuals: { select: { id: true, owner_name: true } },
        companies: { select: { id: true, name: true } },
        users_security_deposits_collected_byTousers: { select: { id: true, full_name: true } },
        users_security_deposits_refunded_byTousers: { select: { id: true, full_name: true } },
      },
    });

    if (!deposit) {
      throw new ApiError('NOT_FOUND', 'Deposit not found', 404);
    }

    res.json({ deposit });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/deposits
 * Collect security deposit (auto-resolves individual/company from contract or occupancy)
 */
router.post('/', requirePermission('deposits.write'), validate(collectDepositSchema), async (req, res, next) => {
  try {
    const {
      camp_id,
      room_id,
      contract_id,
      occupancy_id,
      amount,
      currency,
      payment_method,
      payment_reference,
      notes,
    } = req.body;

    // Verify camp and room belong to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: req.tenantId },
    });

    if (!camp) {
      throw new ApiError('NOT_FOUND', 'Camp not found', 404);
    }

    const room = await prisma.rooms.findFirst({
      where: { id: room_id, camp_id },
    });

    if (!room) {
      throw new ApiError('NOT_FOUND', 'Room not found', 404);
    }

    // Auto-resolve individual_id and company_id from contract or occupancy
    let individual_id = null;
    let company_id = null;

    if (contract_id) {
      const contract = await prisma.contracts.findFirst({
        where: { id: contract_id, room_id },
        select: { individual_id: true, company_id: true },
      });

      if (!contract) {
        throw new ApiError('NOT_FOUND', 'Contract not found', 404);
      }

      individual_id = contract.individual_id;
      company_id = contract.company_id;
    } else if (occupancy_id) {
      const occupancy = await prisma.room_occupancy.findFirst({
        where: { id: occupancy_id, room_id },
        select: { individual_id: true, company_id: true },
      });

      if (!occupancy) {
        throw new ApiError('NOT_FOUND', 'Occupancy not found', 404);
      }

      individual_id = occupancy.individual_id;
      company_id = occupancy.company_id;
    }

    // Create deposit with auto-generated receipt_number (via trigger)
    const deposit = await prisma.security_deposits.create({
      data: {
        tenant_id: req.tenantId,
        camp_id,
        room_id,
        contract_id,
        occupancy_id,
        individual_id,
        company_id,
        amount,
        currency,
        payment_method,
        payment_reference,
        notes,
        status: 'held', // Direct to 'held' status (pending → held transition done immediately)
        collected_by: req.user.id,
        collected_at: new Date(),
      },
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        tenant_id: req.tenantId,
        user_id: req.user.id,
        action: 'deposit.collect',
        entity_type: 'security_deposits',
        entity_id: deposit.id,
        changes: {
          amount,
          payment_method,
          receipt_number: deposit.receipt_number,
        },
      },
    });

    logger.info({ user_id: req.user.id, deposit_id: deposit.id, receipt: deposit.receipt_number }, 'Deposit collected');

    res.status(201).json({ deposit });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/deposits/:id/refund
 * Process refund/forfeiture with state validation
 */
router.post('/:id/refund', requirePermission('deposits.approve'), validate(refundDepositSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refunded_amount, forfeited_amount, refund_reason, forfeiture_reason, refund_method } = req.body;

    // Get existing deposit
    const existing = await prisma.security_deposits.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
    });

    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Deposit not found', 404);
    }

    // Validate state transitions
    if (existing.status === 'refunded' || existing.status === 'forfeited') {
      throw new ApiError('INVALID_STATE', 'Deposit already closed', 409);
    }

    const currentRefunded = new Decimal(existing.refunded_amount || 0);
    const currentForfeited = new Decimal(existing.forfeited_amount || 0);
    const newRefunded = new Decimal(refunded_amount || 0);
    const newForfeited = new Decimal(forfeited_amount || 0);
    const totalAmount = new Decimal(existing.amount);

    const totalRefunded = currentRefunded.plus(newRefunded);
    const totalForfeited = currentForfeited.plus(newForfeited);
    const totalProcessed = totalRefunded.plus(totalForfeited);

    // Validate math constraint
    if (totalProcessed.greaterThan(totalAmount)) {
      throw new ApiError('VALIDATION', `Refund + forfeit (${totalProcessed.toString()}) exceeds deposit amount (${totalAmount.toString()})`, 400);
    }

    // Determine new status
    let newStatus = existing.status;
    if (totalProcessed.equals(totalAmount)) {
      // Fully processed
      if (totalForfeited.equals(totalAmount)) {
        newStatus = 'forfeited';
      } else if (totalRefunded.equals(totalAmount)) {
        newStatus = 'refunded';
      } else {
        newStatus = 'refunded'; // Partial refund + forfeit counts as refunded
      }
    } else if (totalProcessed.greaterThan(0)) {
      newStatus = 'partially_refunded';
    }

    // Update deposit
    const updated = await prisma.security_deposits.update({
      where: { id },
      data: {
        refunded_amount: totalRefunded.toNumber(),
        forfeited_amount: totalForfeited.toNumber(),
        status: newStatus,
        ...(newRefunded.greaterThan(0) && {
          refunded_at: new Date(),
          refunded_by: req.user.id,
          refund_reason,
          refund_method,
        }),
        ...(newForfeited.greaterThan(0) && {
          forfeiture_reason,
        }),
      },
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        tenant_id: req.tenantId,
        user_id: req.user.id,
        action: 'deposit.refund',
        entity_type: 'security_deposits',
        entity_id: id,
        old_values: {
          status: existing.status,
          refunded_amount: existing.refunded_amount,
          forfeited_amount: existing.forfeited_amount,
        },
        new_values: {
          status: newStatus,
          refunded_amount: totalRefunded.toNumber(),
          forfeited_amount: totalForfeited.toNumber(),
        },
      },
    });

    logger.info({ user_id: req.user.id, deposit_id: id, refunded: newRefunded.toNumber(), forfeited: newForfeited.toNumber() }, 'Deposit refund processed');

    res.json({ deposit: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/deposits/:id/receipt-data
 * Get structured data for PDF receipt generation (frontend)
 */
router.get('/:id/receipt-data', requirePermission('deposits.read'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const deposit = await prisma.security_deposits.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
      include: {
        rooms: { select: { room_number: true } },
        camps: { select: { name: true } },
        individuals: { select: { owner_name: true } },
        companies: { select: { name: true } },
        users_security_deposits_collected_byTousers: { select: { full_name: true } },
        tenants: { select: { name: true } },
      },
    });

    if (!deposit) {
      throw new ApiError('NOT_FOUND', 'Deposit not found', 404);
    }

    // Resolve tenant name
    const tenant_name = deposit.companies?.name || deposit.individuals?.owner_name || 'Unknown';

    const receipt_data = {
      receipt_number: deposit.receipt_number,
      date: deposit.collected_at,
      tenant: tenant_name,
      room: deposit.rooms.room_number,
      camp: deposit.camps.name,
      amount: deposit.amount,
      currency: deposit.currency,
      payment_method: deposit.payment_method,
      payment_reference: deposit.payment_reference,
      collected_by: deposit.users_security_deposits_collected_byTousers?.full_name || 'System',
      issuing_entity: deposit.tenants.name,
      notes: deposit.notes,
    };

    res.json({ receipt_data });
  } catch (error) {
    next(error);
  }
});

export default router;
