import express from 'express';
import prisma from '../lib/prisma.js';
import { z } from 'zod';

const router = express.Router();

// Validation schema for snooze endpoint
const snoozeSchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

/**
 * GET /api/v1/notifications?unread=true
 *
 * Lists notifications for the authenticated user's tenant.
 * Filters out snoozed notifications (snoozed_until IS NULL OR < now).
 */
router.get('/', async (req, res) => {
  const tenantId = req.tenantId;
  const { unread } = req.query;
  const now = new Date();

  try {
    const notifications = await prisma.notifications.findMany({
      where: {
        tenant_id: tenantId,
        ...(unread === 'true' ? { is_read: false } : {}),
        OR: [
          { snoozed_until: null },
          { snoozed_until: { lt: now } },  // snooze expired
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notifications.count({
      where: {
        tenant_id: tenantId,
        is_read: false,
        OR: [
          { snoozed_until: null },
          { snoozed_until: { lt: now } },
        ]
      }
    });

    res.json({ data: notifications, unread_count: unreadCount });
  } catch (err) {
    console.error('[notifications/list] error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Failed to fetch notifications'
      }
    });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 *
 * Marks a notification as read.
 */
router.patch('/:id/read', async (req, res) => {
  const tenantId = req.tenantId;

  try {
    // Tenant check — prevent marking another tenant's notifications
    const existing = await prisma.notifications.findFirst({
      where: { id: req.params.id, tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    await prisma.notifications.update({
      where: { id: req.params.id },
      data: { is_read: true, read_at: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications/read] error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Failed to mark as read'
      }
    });
  }
});

/**
 * POST /api/v1/notifications/read-all
 *
 * Marks all unread notifications as read for the authenticated user's tenant.
 */
router.post('/read-all', async (req, res) => {
  const tenantId = req.tenantId;

  try {
    await prisma.notifications.updateMany({
      where: { tenant_id: tenantId, is_read: false },
      data: { is_read: true, read_at: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications/read-all] error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Failed to mark all as read'
      }
    });
  }
});

/**
 * POST /api/v1/notifications/:id/snooze
 *
 * Snoozes a notification for N days (default 7).
 * Sets snoozed_until timestamp and marks as read.
 */
router.post('/:id/snooze', async (req, res) => {
  const tenantId = req.tenantId;
  const parsed = snoozeSchema.safeParse(req.body || {});
  const days = parsed.success ? parsed.data.days : 7;

  try {
    const existing = await prisma.notifications.findFirst({
      where: { id: req.params.id, tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    const snoozedUntil = new Date(Date.now() + days * 86400000);

    await prisma.notifications.update({
      where: { id: req.params.id },
      data: {
        snoozed_until: snoozedUntil,
        is_read: true,
        read_at: new Date()
      }
    });

    res.json({ success: true, snoozed_until: snoozedUntil });
  } catch (err) {
    console.error('[notifications/snooze] error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Snooze failed'
      }
    });
  }
});

export default router;
