import express from 'express';
import prisma from '../lib/prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError, respondError } from '../lib/errors.js';
import { checkoutSchema, checkinSchema, giveNoticeSchema, completeCheckoutSchema } from '../schemas/occupancy.js';
import { z } from 'zod';

const router = express.Router();

const searchSchema = z.object({
  query: z.string().min(2).max(100),
  type: z.enum(['individual', 'company']),
});

// ============================================================================
// POST /api/v1/occupancy/checkout - Checkout with balance guard
// ============================================================================

router.post('/checkout', requirePermission('rooms.write'), validate(checkoutSchema, 'body'), async (req, res) => {
  const tenantId = req.tenantId;
  const {
    room_id, camp_id, occupancy_id,
    checkout_date, reason_for_leaving,
    final_balance_settled, notes
  } = req.validBody;

  try {
    // Verify room belongs to tenant
    const room = await prisma.rooms.findFirst({
      where: { id: room_id, camp_id }
    });
    if (!room) {
      return res.status(404).json({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    }

    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: tenantId }
    });
    if (!camp) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Camp not in your tenant' } });
    }

    // ⚠️ BALANCE GUARD — new behaviour
    const balanceAgg = await prisma.monthly_records.aggregate({
      where: { room_id, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const outstandingBalance = Number(balanceAgg._sum.balance || 0);

    if (outstandingBalance > 0 && !final_balance_settled) {
      return res.status(409).json({
        error: {
          code: 'OUTSTANDING_BALANCE',
          message: `Cannot check out with outstanding balance of AED ${outstandingBalance.toFixed(2)}. Settle the balance or tick "Balance fully settled" to record as a writeoff.`,
          details: { outstanding_balance: outstandingBalance }
        }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If balance > 0 and settled=true → write-off
      if (outstandingBalance > 0 && final_balance_settled) {
        const occupancy = occupancy_id
          ? await tx.room_occupancy.findUnique({ where: { id: occupancy_id } })
          : await tx.room_occupancy.findFirst({ where: { room_id, is_current: true } });

        await tx.balance_writeoffs.create({
          data: {
            tenant_id: tenantId,
            room_id,
            camp_id,
            occupancy_id: occupancy?.id,
            individual_id: occupancy?.individual_id,
            company_id: occupancy?.company_id,
            amount: outstandingBalance,
            reason: reason_for_leaving || 'Checkout without full payment',
            written_off_by: req.user.id,
            notes,
          }
        });
      }

      // Close occupancy
      if (occupancy_id) {
        await tx.room_occupancy.update({
          where: { id: occupancy_id },
          data: {
            is_current: false,
            check_out_date: new Date(checkout_date),
            reason_for_leaving,
            status: 'checked_out',
          }
        });
      } else {
        await tx.room_occupancy.updateMany({
          where: { room_id, is_current: true },
          data: {
            is_current: false,
            check_out_date: new Date(checkout_date),
            reason_for_leaving: reason_for_leaving || 'Manual checkout',
            status: 'checked_out',
          }
        });
      }

      const updatedRoom = await tx.rooms.update({
        where: { id: room_id },
        data: { status: 'vacant' }
      });

      await tx.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: req.user.id,
          action: 'occupancy.checkout',
          resource_type: 'room',
          resource_id: room_id,
          new_values: {
            checkout_date,
            reason_for_leaving,
            outstanding_balance: outstandingBalance,
            final_balance_settled,
            writeoff_recorded: outstandingBalance > 0 && final_balance_settled,
            notes,
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        }
      });

      return updatedRoom;
    });

    res.json({
      success: true,
      room: result,
      outstanding_balance_written_off: outstandingBalance > 0 && final_balance_settled ? outstandingBalance : 0,
      message: 'Tenant checked out successfully'
    });
  } catch (err) {
    console.error('[occupancy/checkout] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Checkout failed' } });
  }
});

// ============================================================================
// POST /api/v1/occupancy/checkin - Checkin with entity dedup
// ============================================================================

router.post('/checkin', requirePermission('rooms.write'), validate(checkinSchema, 'body'), async (req, res) => {
  const tenantId = req.tenantId;
  const {
    room_id,
    camp_id,
    // Camp 1 fields
    owner_name,
    individual_id,
    // Camp 2 fields
    company_id,
    company_name,
    contract_type,
    contract_start_date,
    contract_end_date,
    ejari_number,
    // Both camps
    monthly_rent,
    people_count,
    checkin_date,
    off_days,
    // Emergency contact fields
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    emergency_contact_country,
    // Force new flags
    force_new_individual,
    force_new_company,
  } = req.validBody;

  try {
    // Validate camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: tenantId }
    });
    if (!camp) {
      return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: 'Camp not found' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      let resolvedIndividualId = individual_id;
      let resolvedCompanyId = company_id;

      // Auto-create individual if name provided but no ID
      if (owner_name && !individual_id) {
        // Check for duplicate before creating (unless force_new)
        if (!force_new_individual) {
          const possibleMatch = await tx.individuals.findFirst({
            where: {
              tenant_id: tenantId,
              is_active: true,
              owner_name: { equals: owner_name, mode: 'insensitive' }
            }
          });
          if (possibleMatch) {
            return res.status(409).json({
              error: {
                code: 'POSSIBLE_DUPLICATE',
                message: `An individual named "${possibleMatch.owner_name}" already exists. Confirm by providing individual_id, or set force_new_individual: true to create a new record.`,
                details: { match: possibleMatch }
              }
            });
          }
        }

        // Proceed with creation
        const newIndividual = await tx.individuals.create({
          data: {
            tenant_id: tenantId,
            owner_name,
            is_active: true,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation,
            emergency_contact_country,
            created_at: new Date(),
          }
        });
        resolvedIndividualId = newIndividual.id;
      }

      // Auto-create company if name provided but no ID
      if (company_name && !company_id) {
        // Check for duplicate before creating (unless force_new)
        if (!force_new_company) {
          const possibleMatch = await tx.companies.findFirst({
            where: {
              tenant_id: tenantId,
              is_active: true,
              name: { equals: company_name, mode: 'insensitive' }
            }
          });
          if (possibleMatch) {
            return res.status(409).json({
              error: {
                code: 'POSSIBLE_DUPLICATE',
                message: `A company named "${possibleMatch.name}" already exists. Confirm by providing company_id, or set force_new_company: true to create a new record.`,
                details: { match: possibleMatch }
              }
            });
          }
        }

        // Proceed with creation
        const newCompany = await tx.companies.create({
          data: {
            tenant_id: tenantId,
            name: company_name,
            name_normalized: company_name.toUpperCase(),
            is_active: true,
            created_at: new Date(),
          }
        });
        resolvedCompanyId = newCompany.id;
      }

      // Create contract if applicable (Camp 2 or Camp 1 yearly)
      let contractId = null;
      const shouldCreateContract = contract_type && contract_type !== 'monthly' &&
        (resolvedCompanyId || resolvedIndividualId);

      if (shouldCreateContract) {
        const newContract = await tx.contracts.create({
          data: {
            camp_id,
            room_id,
            company_id: resolvedCompanyId || null,
            individual_id: resolvedIndividualId || null,
            contract_type,
            monthly_rent: parseFloat(monthly_rent),
            start_date: contract_start_date ? new Date(contract_start_date) : new Date(checkin_date),
            end_date: contract_end_date ? new Date(contract_end_date) : null,
            ejari_number: ejari_number || null,
            status: 'active',
            created_at: new Date(),
          }
        });
        contractId = newContract.id;
      }

      // Create occupancy record
      const occupancy = await tx.room_occupancy.create({
        data: {
          room_id,
          camp_id,
          individual_id: resolvedIndividualId || null,
          company_id: resolvedCompanyId || null,
          contract_id: contractId || null,
          people_count: parseInt(people_count) || 0,
          monthly_rent: parseFloat(monthly_rent),
          check_in_date: new Date(checkin_date),
          off_days: parseInt(off_days) || 0,
          status: 'active',
          is_current: true,
          created_at: new Date(),
        }
      });

      // Update room status to occupied
      const room = await tx.rooms.update({
        where: { id: room_id },
        data: {
          status: 'occupied',
          standard_rent: parseFloat(monthly_rent),
          updated_at: new Date(),
        }
      });

      // Create monthly record for current month
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check if record already exists
      const existing = await tx.monthly_records.findFirst({
        where: { room_id, month, year }
      });

      if (!existing) {
        await tx.monthly_records.create({
          data: {
            room_id,
            camp_id,
            occupancy_id: occupancy.id,
            month,
            year,
            individual_id: resolvedIndividualId || null,
            owner_name: owner_name || null,
            company_id: resolvedCompanyId || null,
            company_name: company_name || null,
            contract_type: contract_type || null,
            people_count: parseInt(people_count) || 0,
            rent: parseFloat(monthly_rent),
            paid: 0,
            off_days: parseInt(off_days) || 0,
            created_at: new Date(),
          }
        });
      }

      return { room, occupancy };
    });

    res.json({ success: true, ...result, message: 'Tenant checked in successfully' });
  } catch (err) {
    console.error('[occupancy/checkin] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Check-in failed' } });
  }
});

// ============================================================================
// GET /api/v1/occupancy/search-entities - Entity autocomplete for dedup
// ============================================================================

router.get('/search-entities', requirePermission('rooms.read'), validate(searchSchema, 'query'), async (req, res) => {
  const tenantId = req.tenantId;
  const { query, type } = req.validQuery;
  const normalized = query.trim().toUpperCase();

  try {
    if (type === 'company') {
      const matches = await prisma.companies.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          OR: [
            { name_normalized: { contains: normalized } },
            { name: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          name: true,
          contact_person: true,
          contact_phone: true,
          related_entity_id: true
        },
        take: 10,
        orderBy: { name: 'asc' }
      });
      return res.json({ data: matches });
    }

    // individuals
    const matches = await prisma.individuals.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { owner_name: { contains: query, mode: 'insensitive' } },
          { full_name: { contains: query, mode: 'insensitive' } },
          { mobile_number: { contains: query } },
        ]
      },
      select: {
        id: true,
        owner_name: true,
        full_name: true,
        mobile_number: true,
        nationality: true
      },
      take: 10,
      orderBy: { owner_name: 'asc' }
    });
    res.json({ data: matches });
  } catch (err) {
    console.error('[occupancy/search-entities]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Search failed' } });
  }
});

// ============================================================================
// POST /api/v1/occupancy/notice - Stage 1: Give notice of intent to vacate
// ============================================================================

router.post('/notice', requirePermission('rooms.write'), validate(giveNoticeSchema, 'body'), async (req, res) => {
  const tenantId = req.tenantId;
  const { room_id, camp_id, occupancy_id, intended_vacate_date, notes } = req.validBody;

  try {
    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: tenantId }
    });
    if (!camp) {
      return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: 'Camp not found' } });
    }

    // Get occupancy
    const occupancy = occupancy_id
      ? await prisma.room_occupancy.findUnique({ where: { id: occupancy_id } })
      : await prisma.room_occupancy.findFirst({ where: { room_id, is_current: true } });

    if (!occupancy) {
      return res.status(404).json({ error: { code: 'OCCUPANCY_NOT_FOUND', message: 'No active occupancy found' } });
    }

    if (occupancy.status !== 'active') {
      return res.status(409).json({ error: { code: 'INVALID_STATE', message: `Cannot give notice for occupancy in status: ${occupancy.status}` } });
    }

    // Update occupancy and room
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.room_occupancy.update({
        where: { id: occupancy.id },
        data: {
          status: 'notice_given',
          notice_given_at: new Date(),
          notice_given_by: req.user.id,
          intended_vacate_date: new Date(intended_vacate_date),
          notes: notes ? `[NOTICE] ${notes}\n${occupancy.notes || ''}` : occupancy.notes,
        }
      });

      await tx.rooms.update({
        where: { id: room_id },
        data: { status: 'vacating' }
      });

      await tx.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: req.user.id,
          action: 'occupancy.notice_given',
          resource_type: 'room_occupancy',
          resource_id: occupancy.id,
          new_values: {
            intended_vacate_date,
            notes,
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        }
      });

      return updated;
    });

    res.json({ success: true, occupancy: result, message: 'Notice recorded successfully' });
  } catch (err) {
    console.error('[occupancy/notice] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to record notice' } });
  }
});

// ============================================================================
// POST /api/v1/occupancy/complete-checkout - Stage 2: Finalize checkout
// ============================================================================

router.post('/complete-checkout', requirePermission('rooms.write'), validate(completeCheckoutSchema, 'body'), async (req, res) => {
  const tenantId = req.tenantId;
  const {
    room_id, camp_id, occupancy_id,
    actual_checkout_date, reason_for_leaving, inspection_notes,
    final_balance_settled,
    deposit_action, deposit_refund_amount, deposit_forfeit_amount, deposit_reason,
    notes
  } = req.validBody;

  try {
    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: tenantId }
    });
    if (!camp) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Camp not in your tenant' } });
    }

    // Balance guard
    const balanceAgg = await prisma.monthly_records.aggregate({
      where: { room_id, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const outstandingBalance = Number(balanceAgg._sum.balance || 0);

    if (outstandingBalance > 0 && !final_balance_settled) {
      return res.status(409).json({
        error: {
          code: 'OUTSTANDING_BALANCE',
          message: `Cannot complete checkout with outstanding balance of AED ${outstandingBalance.toFixed(2)}`,
          details: { outstanding_balance: outstandingBalance }
        }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Close occupancy
      const occupancy = occupancy_id
        ? await tx.room_occupancy.findUnique({ where: { id: occupancy_id } })
        : await tx.room_occupancy.findFirst({ where: { room_id, is_current: true } });

      if (!occupancy) {
        throw new Error('Occupancy not found');
      }

      await tx.room_occupancy.update({
        where: { id: occupancy.id },
        data: {
          is_current: false,
          status: 'checked_out',
          check_out_date: new Date(actual_checkout_date),
          reason_for_leaving,
          inspection_notes,
          inspection_by: req.user.id,
          inspection_at: new Date(),
        }
      });

      // 2. Write off balance if settled
      if (outstandingBalance > 0 && final_balance_settled) {
        await tx.balance_writeoffs.create({
          data: {
            tenant_id: tenantId,
            room_id,
            camp_id,
            occupancy_id: occupancy.id,
            individual_id: occupancy.individual_id,
            company_id: occupancy.company_id,
            amount: outstandingBalance,
            reason: reason_for_leaving || 'Checkout without full payment',
            written_off_by: req.user.id,
            notes,
          }
        });
      }

      // 3. Process deposits
      if (deposit_action && deposit_action !== 'none') {
        const deposits = await tx.security_deposits.findMany({
          where: {
            room_id,
            occupancy_id: occupancy.id,
            status: { in: ['held', 'partially_refunded'] },
          }
        });

        for (const deposit of deposits) {
          const remaining = deposit.amount - (deposit.refunded_amount || 0) - (deposit.forfeited_amount || 0);

          if (deposit_action === 'refund_full') {
            await tx.security_deposits.update({
              where: { id: deposit.id },
              data: {
                refunded_amount: deposit.amount,
                status: 'refunded',
                refunded_at: new Date(),
                refunded_by: req.user.id,
                refund_reason: deposit_reason,
              }
            });
          } else if (deposit_action === 'forfeit_full') {
            await tx.security_deposits.update({
              where: { id: deposit.id },
              data: {
                forfeited_amount: deposit.amount,
                status: 'forfeited',
                forfeiture_reason: deposit_reason,
              }
            });
          } else if (deposit_action === 'refund_partial') {
            await tx.security_deposits.update({
              where: { id: deposit.id },
              data: {
                refunded_amount: (deposit.refunded_amount || 0) + (deposit_refund_amount || 0),
                forfeited_amount: (deposit.forfeited_amount || 0) + (deposit_forfeit_amount || 0),
                status: 'refunded',
                refunded_at: new Date(),
                refunded_by: req.user.id,
                refund_reason: deposit_reason,
                forfeiture_reason: deposit_reason,
              }
            });
          }
        }
      }

      // 4. Cancel future payment schedules
      await tx.payment_schedules.updateMany({
        where: {
          room_id,
          status: 'scheduled',
          due_date: { gt: new Date(actual_checkout_date) },
        },
        data: { status: 'cancelled' }
      });

      // 5. Terminate contract
      if (occupancy.contract_id) {
        await tx.contracts.update({
          where: { id: occupancy.contract_id },
          data: { status: 'terminated' }
        });
      }

      // 6. Vacate room
      const room = await tx.rooms.update({
        where: { id: room_id },
        data: { status: 'vacant' }
      });

      // 7. Audit log
      await tx.audit_logs.create({
        data: {
          tenant_id: tenantId,
          user_id: req.user.id,
          action: 'occupancy.complete_checkout',
          resource_type: 'room',
          resource_id: room_id,
          new_values: {
            actual_checkout_date,
            reason_for_leaving,
            outstanding_balance_written_off: outstandingBalance > 0 && final_balance_settled ? outstandingBalance : 0,
            deposit_action,
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        }
      });

      return room;
    });

    res.json({
      success: true,
      room: result,
      outstanding_balance_written_off: outstandingBalance > 0 && final_balance_settled ? outstandingBalance : 0,
      message: 'Checkout completed successfully'
    });
  } catch (err) {
    console.error('[occupancy/complete-checkout] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Complete checkout failed' } });
  }
});

export default router;
