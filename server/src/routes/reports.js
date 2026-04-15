import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/reports/rent-roll?campId=X&month=4&year=2026
router.get('/rent-roll', async (req, res) => {
  const { campId, month, year } = req.query;
  if (!campId || !month || !year) return res.status(400).json({ error: 'campId, month, year required' });

  try {
    const records = await prisma.monthly_records.findMany({
      where: { camp_id: campId, month: parseInt(month), year: parseInt(year) },
      include: {
        rooms: {
          include: {
            blocks: { select: { code: true, floor_label: true } }
          }
        },
        individuals: { select: { owner_name: true } },
        companies: { select: { name: true } },
      },
      orderBy: [{ rooms: { room_number: 'asc' } }]
    });

    const camp = await prisma.camps.findUnique({ where: { id: campId } });

    const totals = records.reduce((acc, r) => ({
      rent: acc.rent + r.rent,
      paid: acc.paid + r.paid,
      balance: acc.balance + r.balance,
    }), { rent: 0, paid: 0, balance: 0 });

    res.json({
      report_type: 'rent_roll',
      camp: { id: camp.id, name: camp.name, code: camp.code },
      period: { month: parseInt(month), year: parseInt(year) },
      records: records.map(r => ({
        sr_number: r.rooms?.sr_number,
        room_number: r.rooms?.room_number,
        block: r.rooms?.blocks?.code,
        floor: r.rooms?.blocks?.floor_label,
        tenant_name: r.companies?.name || r.individuals?.owner_name || r.owner_name || r.company_name || '—',
        contract_type: r.contract_type || '—',
        people_count: r.people_count,
        rent: r.rent,
        paid: r.paid,
        balance: r.balance,
        remarks: r.remarks || '',
      })),
      totals,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/occupancy?campId=X
router.get('/occupancy', async (req, res) => {
  const { campId } = req.query;
  if (!campId) return res.status(400).json({ error: 'campId required' });

  try {
    const rooms = await prisma.rooms.findMany({
      where: { camp_id: campId, is_active: true },
      include: {
        blocks: { select: { code: true, floor_label: true } },
        buildings: { select: { code: true, name: true } },
        room_occupancy: {
          where: { is_current: true },
          include: {
            individuals: { select: { owner_name: true } },
            companies: { select: { name: true } },
          }
        }
      },
      orderBy: { room_number: 'asc' }
    });

    const camp = await prisma.camps.findUnique({ where: { id: campId } });

    const summary = rooms.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      report_type: 'occupancy',
      camp: { id: camp.id, name: camp.name, code: camp.code },
      summary: {
        total: rooms.length,
        occupied: summary.occupied || 0,
        vacant: summary.vacant || 0,
        bartawi_use: summary.bartawi_use || 0,
        maintenance: summary.maintenance || 0,
        occupancy_rate: rooms.length > 0
          ? ((summary.occupied || 0) / rooms.length * 100).toFixed(1)
          : 0,
      },
      rooms: rooms.map(r => ({
        room_number: r.room_number,
        block: r.blocks?.code,
        floor: r.blocks?.floor_label,
        building: r.buildings?.code,
        status: r.status,
        room_type: r.room_type,
        max_capacity: r.max_capacity,
        current_occupant: r.room_occupancy[0]?.companies?.name
          || r.room_occupancy[0]?.individuals?.owner_name
          || (r.status === 'bartawi_use' ? 'Bartawi LLC' : '—'),
        people_count: r.room_occupancy[0]?.people_count || 0,
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/outstanding?campId=X&month=4&year=2026
router.get('/outstanding', async (req, res) => {
  const { campId, month, year } = req.query;
  if (!campId || !month || !year) return res.status(400).json({ error: 'campId, month, year required' });

  try {
    const records = await prisma.monthly_records.findMany({
      where: {
        camp_id: campId,
        month: parseInt(month),
        year: parseInt(year),
        balance: { gt: 0 }
      },
      include: {
        rooms: { include: { blocks: { select: { code: true } } } },
        companies: { select: { name: true, contact_phone: true } },
        individuals: { select: { owner_name: true, mobile_number: true } },
      },
      orderBy: { balance: 'desc' }
    });

    const camp = await prisma.camps.findUnique({ where: { id: campId } });
    const totalOutstanding = records.reduce((s, r) => s + r.balance, 0);

    res.json({
      report_type: 'outstanding',
      camp: { id: camp.id, name: camp.name, code: camp.code },
      period: { month: parseInt(month), year: parseInt(year) },
      total_outstanding: totalOutstanding,
      count: records.length,
      records: records.map(r => ({
        room_number: r.rooms?.room_number,
        block: r.rooms?.blocks?.code,
        tenant_name: r.companies?.name || r.individuals?.owner_name || r.company_name || r.owner_name || '—',
        contact: r.companies?.contact_phone || r.individuals?.mobile_number || '—',
        rent: r.rent,
        paid: r.paid,
        balance: r.balance,
        remarks: r.remarks || '',
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/summary?campId=X&month=4&year=2026
router.get('/summary', async (req, res) => {
  const { campId, month, year } = req.query;
  if (!campId || !month || !year) return res.status(400).json({ error: 'campId, month, year required' });

  try {
    const [records, rooms, camp] = await Promise.all([
      prisma.monthly_records.findMany({
        where: { camp_id: campId, month: parseInt(month), year: parseInt(year) }
      }),
      prisma.rooms.findMany({
        where: { camp_id: campId, is_active: true }
      }),
      prisma.camps.findUnique({ where: { id: campId } })
    ]);

    const occupancy = rooms.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const financials = records.reduce((acc, r) => ({
      total_rent: acc.total_rent + r.rent,
      total_paid: acc.total_paid + r.paid,
      total_balance: acc.total_balance + r.balance,
    }), { total_rent: 0, total_paid: 0, total_balance: 0 });

    res.json({
      report_type: 'summary',
      camp: { id: camp.id, name: camp.name, code: camp.code },
      period: { month: parseInt(month), year: parseInt(year) },
      occupancy: {
        total_rooms: rooms.length,
        leasable_rooms: camp.leasable_rooms,
        occupied: occupancy.occupied || 0,
        vacant: occupancy.vacant || 0,
        bartawi_use: occupancy.bartawi_use || 0,
        occupancy_rate: parseFloat(((occupancy.occupied || 0) / camp.leasable_rooms * 100).toFixed(1)),
      },
      financials: {
        ...financials,
        collection_rate: financials.total_rent > 0
          ? parseFloat((financials.total_paid / financials.total_rent * 100).toFixed(1))
          : 0,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
