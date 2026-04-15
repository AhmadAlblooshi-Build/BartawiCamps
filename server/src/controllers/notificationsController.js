import prisma from '../lib/prisma.js';

/**
 * GET /api/notifications
 * Get all notifications for the tenant
 */
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const notifications = await prisma.notifications.findMany({
      where: {
        tenant_id: req.tenantId,
        is_snoozed: false,
      },
      orderBy: [
        { is_read: 'asc' },
        { created_at: 'desc' }
      ],
      skip,
      take,
    });

    const unread_count = await prisma.notifications.count({
      where: {
        tenant_id: req.tenantId,
        is_read: false,
        is_snoozed: false,
      }
    });

    res.json({
      data: notifications,
      unread_count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      }
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Failed to list notifications' });
  }
};

/**
 * POST /api/notifications/:id/mark-read
 * Mark a notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notifications.findFirst({
      where: { id, tenant_id: req.tenantId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notifications.update({
      where: { id },
      data: { is_read: true, read_at: new Date() }
    });

    res.json({ message: 'Notification marked as read', notification: updated });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * POST /api/notifications/:id/snooze
 * Snooze a notification for 7 days
 */
export const snoozeNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notifications.findFirst({
      where: { id, tenant_id: req.tenantId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Snooze for 7 days
    const snooze_until = new Date();
    snooze_until.setDate(snooze_until.getDate() + 7);

    const updated = await prisma.notifications.update({
      where: { id },
      data: {
        is_snoozed: true,
        snoozed_until: snooze_until,
      }
    });

    res.json({ message: 'Notification snoozed for 7 days', notification: updated });
  } catch (err) {
    console.error('Snooze notification error:', err);
    res.status(500).json({ error: 'Failed to snooze notification' });
  }
};

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const result = await prisma.notifications.updateMany({
      where: {
        tenant_id: req.tenantId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      }
    });

    res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};
