import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/notifications?unread=true
router.get('/', async (req, res) => {
  const { unread } = req.query;
  try {
    const tenant = await prisma.tenants.findFirst({ where: { slug: 'bartawi' } });
    const notifications = await prisma.notifications.findMany({
      where: {
        tenant_id: tenant.id,
        ...(unread === 'true' ? { is_read: false } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notifications.count({
      where: { tenant_id: tenant.id, is_read: false }
    });
    res.json({ data: notifications, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await prisma.notifications.update({
      where: { id: req.params.id },
      data: { is_read: true, read_at: new Date() }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    const tenant = await prisma.tenants.findFirst({ where: { slug: 'bartawi' } });
    await prisma.notifications.updateMany({
      where: { tenant_id: tenant.id, is_read: false },
      data: { is_read: true, read_at: new Date() }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/snooze — hides for 7 days
router.post('/:id/snooze', async (req, res) => {
  const { days = 7 } = req.body;
  try {
    // Mark as read, it will be re-created by the cron if still applicable
    await prisma.notifications.update({
      where: { id: req.params.id },
      data: {
        is_read: true,
        read_at: new Date(),
      }
    });
    res.json({ success: true, snoozed_until: new Date(Date.now() + days * 86400000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
