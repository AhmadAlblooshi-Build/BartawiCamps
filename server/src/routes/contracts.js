import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/contracts?campId=X&status=active
router.get('/', async (req, res) => {
  const { campId, status } = req.query;
  try {
    const where = {};
    if (campId) where.camp_id = campId;
    if (status) where.status = status;

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        rooms: { select: { room_number: true, block_id: true } },
        companies: { select: { id: true, name: true, contact_person: true, contact_phone: true } },
        contract_alerts: {
          where: { is_acknowledged: false },
          orderBy: { created_at: 'desc' },
          take: 1,
        }
      },
      orderBy: { end_date: 'asc' },
    });

    // Enrich with days until expiry
    const now = new Date();
    const enriched = contracts.map(c => ({
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
        : 'healthy'
    }));

    res.json({ data: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contracts/:id/renew
router.put('/:id/renew', async (req, res) => {
  const { id } = req.params;
  const { new_end_date, new_monthly_rent, notes } = req.body;

  if (!new_end_date) return res.status(400).json({ error: 'new_end_date required' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.contracts.update({
        where: { id },
        data: {
          end_date: new Date(new_end_date),
          monthly_rent: new_monthly_rent ? parseFloat(new_monthly_rent) : undefined,
          status: 'active',
          updated_at: new Date(),
        },
        include: {
          rooms: { select: { room_number: true } },
          companies: { select: { name: true } },
        }
      });

      // Acknowledge all pending alerts for this contract
      await tx.contract_alerts.updateMany({
        where: { contract_id: id, is_acknowledged: false },
        data: { is_acknowledged: true, acknowledged_at: new Date() }
      });

      // Dismiss related notifications
      await tx.notifications.updateMany({
        where: {
          resource_type: 'contract',
          resource_id: id,
          is_read: false,
        },
        data: { is_read: true, read_at: new Date() }
      });

      return contract;
    });

    res.json({ success: true, contract: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/contracts/:id/status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const allowed = ['active', 'terminated', 'legal_dispute', 'expired'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const contract = await prisma.contracts.update({
      where: { id },
      data: { status, updated_at: new Date() }
    });
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contracts/:id/notes
router.get('/:id/notes', async (req, res) => {
  const { id } = req.params;
  try {
    const alerts = await prisma.contract_alerts.findMany({
      where: { contract_id: id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts/:id/notes
router.post('/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { note, alert_type } = req.body;
  try {
    const contract = await prisma.contracts.findUnique({ where: { id } });
    const entry = await prisma.contract_alerts.create({
      data: {
        contract_id: id,
        camp_id: contract.camp_id,
        alert_type: alert_type || 'manual_note',
        is_acknowledged: false,
        created_at: new Date(),
      }
    });
    res.json({ success: true, note: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
