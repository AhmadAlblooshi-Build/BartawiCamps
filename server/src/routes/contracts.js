import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError, respondError } from '../lib/errors.js';
import { encodeCursor, paginateWhere } from '../lib/paginate.js';
import { renewSchema, updateStatusSchema, addNoteSchema, listQuerySchema } from '../schemas/contracts.js';
import { z } from 'zod';

const router = express.Router();

const ackAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

// ============================================================================
// GET /api/v1/contracts - List contracts with pagination and tenant scoping
// ============================================================================

router.get('/', requirePermission('contracts.read'), validate(listQuerySchema, 'query'), async (req, res) => {
  const { campId, status, limit, cursor } = req.validQuery;
  const tenantId = req.tenantId;

  try {
    const where = {
      ...(campId ? { camp_id: campId } : {}),
      ...(status ? { status } : {}),
      camps: { tenant_id: tenantId },
      ...paginateWhere(cursor),
    };

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        rooms: { select: { room_number: true, block_id: true } },
        companies: { select: { id: true, name: true, contact_person: true, contact_phone: true } },
        individuals: { select: { id: true, owner_name: true } },
        contract_alerts: {
          where: { is_acknowledged: false },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = contracts.length > limit;
    const items = hasMore ? contracts.slice(0, limit) : contracts;

    // Enrich with days until expiry and urgency
    const now = new Date();
    const enriched = items.map(c => ({
      ...c,
      days_until_expiry: c.end_date
        ? Math.ceil((new Date(c.end_date) - now) / (1000 * 60 * 60 * 24))
        : null,
      urgency: c.end_date
        ? (() => {
            const days = Math.ceil((new Date(c.end_date) - now) / (1000 * 60 * 60 * 24));
            if (days < 0) return 'expired';
            if (days <= 30) return 'critical';
            if (days <= 60) return 'warning';
            if (days <= 90) return 'notice';
            return 'healthy';
          })()
        : 'healthy',
    }));

    res.json({
      data: enriched,
      pagination: {
        limit,
        has_more: hasMore,
        next_cursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
      },
    });
  } catch (err) {
    console.error('[contracts/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch contracts' } });
  }
});

// ============================================================================
// PUT /api/v1/contracts/:id/renew - Renew contract with history snapshot
// ============================================================================

router.put('/:id/renew', requirePermission('contracts.write'), validate(renewSchema), async (req, res) => {
  const tenantId = req.tenantId;
  const { new_end_date, new_monthly_rent, notes } = req.validBody;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify contract belongs to tenant
      const existing = await tx.contracts.findFirst({
        where: { id: req.params.id, camps: { tenant_id: tenantId } },
      });

      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Contract not found');
      }

      // Create renewal history snapshot
      await tx.contract_renewals.create({
        data: {
          contract_id: req.params.id,
          previous_end_date: existing.end_date,
          new_end_date: new Date(new_end_date),
          previous_monthly_rent: existing.monthly_rent,
          new_monthly_rent: new_monthly_rent ?? existing.monthly_rent,
          renewed_by: req.user.id,
          notes,
        },
      });

      // Update contract
      const updated = await tx.contracts.update({
        where: { id: req.params.id },
        data: {
          end_date: new Date(new_end_date),
          monthly_rent: new_monthly_rent ?? existing.monthly_rent,
          status: 'active',
        },
        include: {
          rooms: { select: { room_number: true } },
          companies: { select: { name: true } },
          individuals: { select: { owner_name: true } },
        },
      });

      // Acknowledge all pending alerts for this contract
      await tx.contract_alerts.updateMany({
        where: { contract_id: req.params.id, is_acknowledged: false },
        data: {
          is_acknowledged: true,
          acknowledged_at: new Date(),
          acknowledged_by: req.user.id,
        },
      });

      // Dismiss related notifications
      await tx.notifications.updateMany({
        where: {
          tenant_id: tenantId,
          resource_type: 'contract',
          resource_id: req.params.id,
          is_read: false,
        },
        data: { is_read: true, read_at: new Date() },
      });

      return updated;
    });

    res.json({ success: true, contract: result });
  } catch (err) {
    if (err instanceof ApiError) return respondError(res, err);
    console.error('[contracts/renew]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Renewal failed' } });
  }
});

// ============================================================================
// GET /api/v1/contracts/:id/renewals - Get contract renewal history
// ============================================================================

router.get('/:id/renewals', requirePermission('contracts.read'), async (req, res) => {
  const tenantId = req.tenantId;

  try {
    // Verify contract belongs to tenant
    const contract = await prisma.contracts.findFirst({
      where: { id: req.params.id, camps: { tenant_id: tenantId } },
    });

    if (!contract) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    const renewals = await prisma.contract_renewals.findMany({
      where: { contract_id: req.params.id },
      include: {
        users: { select: { full_name: true, email: true } },
      },
      orderBy: { renewed_at: 'desc' },
    });

    res.json({ data: renewals });
  } catch (err) {
    console.error('[contracts/renewals]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch renewal history' } });
  }
});

// ============================================================================
// PATCH /api/v1/contracts/:id/status - Update contract status
// ============================================================================

router.patch('/:id/status', requirePermission('contracts.write'), validate(updateStatusSchema), async (req, res) => {
  const tenantId = req.tenantId;
  const { status, notes } = req.validBody;

  try {
    // Verify contract belongs to tenant
    const existing = await prisma.contracts.findFirst({
      where: { id: req.params.id, camps: { tenant_id: tenantId } },
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    const contract = await prisma.contracts.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Optionally log note about status change
    if (notes) {
      await prisma.contract_notes.create({
        data: {
          contract_id: req.params.id,
          body: notes,
          note_type: 'general',
          created_by: req.user.id,
        },
      });
    }

    res.json({ success: true, contract });
  } catch (err) {
    console.error('[contracts/status]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Status update failed' } });
  }
});

// ============================================================================
// PATCH /api/v1/contracts/:id/alerts/ack - Acknowledge contract alerts
// ============================================================================

router.patch('/:id/alerts/ack', requirePermission('contracts.write'), async (req, res) => {
  const tenantId = req.tenantId;
  const parsed = ackAlertSchema.safeParse(req.body || {});

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Invalid input',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    // Verify contract belongs to tenant
    const contract = await prisma.contracts.findFirst({
      where: { id: req.params.id, camps: { tenant_id: tenantId } },
    });

    if (!contract) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    await prisma.$transaction([
      // Acknowledge all pending alerts
      prisma.contract_alerts.updateMany({
        where: { contract_id: req.params.id, is_acknowledged: false },
        data: {
          is_acknowledged: true,
          acknowledged_at: new Date(),
          acknowledged_by: req.user.id,
        },
      }),
      // Dismiss related notifications
      prisma.notifications.updateMany({
        where: {
          tenant_id: tenantId,
          resource_type: 'contract',
          resource_id: req.params.id,
          is_read: false,
        },
        data: { is_read: true, read_at: new Date() },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('[contracts/ack]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Acknowledge failed' } });
  }
});

// ============================================================================
// GET /api/v1/contracts/:id/notes - Get contract notes
// ============================================================================

router.get('/:id/notes', requirePermission('contracts.read'), async (req, res) => {
  const tenantId = req.tenantId;

  try {
    // Verify contract belongs to tenant
    const contract = await prisma.contracts.findFirst({
      where: { id: req.params.id, camps: { tenant_id: tenantId } },
    });

    if (!contract) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    const notes = await prisma.contract_notes.findMany({
      where: { contract_id: req.params.id },
      include: { users: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    });

    res.json({ data: notes });
  } catch (err) {
    console.error('[contracts/notes]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch notes' } });
  }
});

// ============================================================================
// POST /api/v1/contracts/:id/notes - Add contract note
// ============================================================================

router.post('/:id/notes', requirePermission('contracts.write'), validate(addNoteSchema), async (req, res) => {
  const tenantId = req.tenantId;
  const { body, note_type } = req.validBody;

  try {
    // Verify contract belongs to tenant
    const contract = await prisma.contracts.findFirst({
      where: { id: req.params.id, camps: { tenant_id: tenantId } },
    });

    if (!contract) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    }

    const note = await prisma.contract_notes.create({
      data: {
        contract_id: req.params.id,
        body,
        note_type,
        created_by: req.user.id,
      },
      include: {
        users: { select: { full_name: true, email: true } },
      },
    });

    res.status(201).json({ success: true, note });
  } catch (err) {
    console.error('[contracts/notes/add]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to add note' } });
  }
});

export default router;
