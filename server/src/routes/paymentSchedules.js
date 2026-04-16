import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';
import { generateSchedulesSchema, overrideScheduleSchema } from '../schemas/paymentSchedules.js';
import logger from '../lib/logger.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/v1/payment-schedules/generate
 * Generate N months of scheduled payments for a contract or occupancy
 */
router.post('/generate', requirePermission('payments.write'), validate(generateSchedulesSchema), async (req, res, next) => {
  try {
    const {
      contract_id,
      occupancy_id,
      start_month,
      start_year,
      months,
      monthly_amount,
      due_day,
    } = req.body;

    // Get room and camp info
    let room_id, camp_id;

    if (contract_id) {
      const contract = await prisma.contracts.findFirst({
        where: { id: contract_id },
        select: { room_id: true, rooms: { select: { camp_id: true } } },
      });

      if (!contract) {
        throw new ApiError('NOT_FOUND', 'Contract not found', 404);
      }

      room_id = contract.room_id;
      camp_id = contract.rooms.camp_id;
    } else if (occupancy_id) {
      const occupancy = await prisma.room_occupancy.findFirst({
        where: { id: occupancy_id },
        select: { room_id: true, rooms: { select: { camp_id: true } } },
      });

      if (!occupancy) {
        throw new ApiError('NOT_FOUND', 'Occupancy not found', 404);
      }

      room_id = occupancy.room_id;
      camp_id = occupancy.rooms.camp_id;
    } else {
      throw new ApiError('VALIDATION', 'Must provide contract_id or occupancy_id', 400);
    }

    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: camp_id, tenant_id: req.tenantId },
    });

    if (!camp) {
      throw new ApiError('NOT_FOUND', 'Camp not found or access denied', 404);
    }

    // Generate schedules with year rollover
    const schedules = [];
    let current_month = start_month;
    let current_year = start_year;

    for (let i = 0; i < months; i++) {
      // Calculate due date
      const due_date = new Date(current_year, current_month - 1, due_day);

      schedules.push({
        tenant_id: req.tenantId,
        camp_id,
        room_id,
        contract_id,
        occupancy_id,
        month: current_month,
        year: current_year,
        due_date,
        scheduled_amount: monthly_amount,
        status: 'scheduled',
      });

      // Advance month with year rollover
      current_month++;
      if (current_month > 12) {
        current_month = 1;
        current_year++;
      }
    }

    // Use createMany with skipDuplicates to prevent conflicts
    const result = await prisma.payment_schedules.createMany({
      data: schedules,
      skipDuplicates: true,
    });

    logger.info({ user_id: req.user.id, contract_id, occupancy_id, count: result.count }, 'Payment schedules generated');

    res.status(201).json({
      message: `${result.count} payment schedules created`,
      created_count: result.count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payment-schedules
 * List schedules with filters
 */
router.get('/', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { room_id, contract_id, occupancy_id, status, from_date, to_date } = req.query;

    const where = {
      tenant_id: req.tenantId,
      ...(room_id && { room_id }),
      ...(contract_id && { contract_id }),
      ...(occupancy_id && { occupancy_id }),
      ...(status && { status }),
      ...(from_date && { due_date: { gte: new Date(from_date) } }),
      ...(to_date && { due_date: { lte: new Date(to_date) } }),
    };

    if (from_date && to_date) {
      where.due_date = {
        gte: new Date(from_date),
        lte: new Date(to_date),
      };
    }

    const schedules = await prisma.payment_schedules.findMany({
      where,
      orderBy: { due_date: 'asc' },
      include: {
        rooms: { select: { room_number: true } },
        monthly_records: { select: { id: true, total_paid: true } },
      },
    });

    res.json({ schedules });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/payment-schedules/:id
 * Staff override of schedule
 */
router.patch('/:id', requirePermission('payments.write'), validate(overrideScheduleSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduled_amount, due_date, status, notes } = req.body;

    // Verify ownership
    const existing = await prisma.payment_schedules.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
    });

    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Payment schedule not found', 404);
    }

    // Prevent modification of paid rows
    if (existing.status === 'paid') {
      throw new ApiError('INVALID_STATE', 'Cannot modify paid schedule', 409);
    }

    const updates = {
      ...(scheduled_amount !== undefined && { scheduled_amount }),
      ...(due_date && { due_date: new Date(due_date) }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      overridden_by: req.user.id,
      overridden_at: new Date(),
    };

    const updated = await prisma.payment_schedules.update({
      where: { id },
      data: updates,
    });

    logger.info({ user_id: req.user.id, schedule_id: id }, 'Payment schedule overridden');

    res.json({ schedule: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payment-schedules/contracts/:contract_id/regenerate
 * Regenerate schedules for contract renewal
 */
router.post('/contracts/:contract_id/regenerate', requirePermission('contracts.write'), async (req, res, next) => {
  try {
    const { contract_id } = req.params;

    // Get contract with end date
    const contract = await prisma.contracts.findFirst({
      where: { id: contract_id },
      include: {
        rooms: {
          select: { id: true, camp_id: true },
        },
      },
    });

    if (!contract) {
      throw new ApiError('NOT_FOUND', 'Contract not found', 404);
    }

    if (!contract.end_date) {
      throw new ApiError('VALIDATION', 'Contract must have end_date to regenerate schedules', 400);
    }

    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: contract.rooms.camp_id, tenant_id: req.tenantId },
    });

    if (!camp) {
      throw new ApiError('NOT_FOUND', 'Contract not found or access denied', 404);
    }

    // Delete unpaid scheduled rows from today forward
    const deleted = await prisma.payment_schedules.deleteMany({
      where: {
        contract_id,
        status: 'scheduled',
        due_date: { gte: new Date() },
      },
    });

    // Calculate new schedules from next month through contract.end_date
    const now = new Date();
    const start_month = now.getMonth() + 2; // Next month (0-indexed + 1 + 1)
    const start_year = start_month > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const normalized_start_month = start_month > 12 ? 1 : start_month;

    const end_date = new Date(contract.end_date);
    const months_remaining = (end_date.getFullYear() - start_year) * 12 + (end_date.getMonth() + 1 - normalized_start_month);

    if (months_remaining <= 0) {
      return res.json({
        message: 'No future months to schedule',
        deleted_count: deleted.count,
        created_count: 0,
      });
    }

    // Generate new schedules
    const schedules = [];
    let current_month = normalized_start_month;
    let current_year = start_year;

    for (let i = 0; i < months_remaining; i++) {
      schedules.push({
        tenant_id: req.tenantId,
        camp_id: contract.rooms.camp_id,
        room_id: contract.room_id,
        contract_id,
        month: current_month,
        year: current_year,
        due_date: new Date(current_year, current_month - 1, 5), // 5th of month
        scheduled_amount: contract.monthly_rent,
        status: 'scheduled',
      });

      current_month++;
      if (current_month > 12) {
        current_month = 1;
        current_year++;
      }
    }

    const result = await prisma.payment_schedules.createMany({
      data: schedules,
      skipDuplicates: true,
    });

    logger.info({ user_id: req.user.id, contract_id, deleted: deleted.count, created: result.count }, 'Payment schedules regenerated');

    res.json({
      message: 'Payment schedules regenerated',
      deleted_count: deleted.count,
      created_count: result.count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
