import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { reportQuerySchema, occupancyReportQuerySchema } from '../schemas/reports.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════
// Shared helper: resolve requested camp ids to validated camp records.
// Returns { camps, isMulti, error }.
//   - camps:    array of camp records belonging to the tenant
//   - isMulti:  true when the caller supplied camp_ids (list form)
//   - error:    string if any camp id is invalid / not owned by tenant
// ══════════════════════════════════════════════════════════════════
async function resolveCampIds(validQuery, tenantId) {
  const { campId, camp_ids } = validQuery;

  const requestedIds = camp_ids
    ? camp_ids.split(',').map((s) => s.trim()).filter(Boolean)
    : [campId];

  if (requestedIds.length === 0) {
    return { camps: [], isMulti: false, error: 'No camps specified' };
  }

  const camps = await prisma.camps.findMany({
    where: { id: { in: requestedIds }, tenant_id: tenantId },
  });

  if (camps.length !== requestedIds.length) {
    return { camps: [], isMulti: false, error: 'One or more camps not found' };
  }

  // Preserve the order the caller requested
  const byId = new Map(camps.map((c) => [c.id, c]));
  const ordered = requestedIds.map((id) => byId.get(id));

  return { camps: ordered, isMulti: Boolean(camp_ids), error: null };
}

function campRef(c) {
  return { id: c.id, name: c.name, code: c.code };
}

// ══════════════════════════════════════════════════════════════════
// BUILDERS — each returns the per-camp payload for one report type.
// Route handlers wrap one or many of these depending on single vs
// multi-camp mode.
// ══════════════════════════════════════════════════════════════════

async function buildRentRoll(camp, month, year, groupBy) {
  const records = await prisma.monthly_records.findMany({
    where: { camp_id: camp.id, month, year },
    include: {
      rooms: {
        include: {
          blocks: { select: { code: true, floor_label: true } }
        }
      },
      individuals: { select: { owner_name: true } },
      companies: { select: { name: true, entity_group_name: true } },
    },
    orderBy: [{ rooms: { room_number: 'asc' } }]
  });

  const totals = records.reduce((acc, r) => ({
    rent:    acc.rent.plus(r.rent),
    paid:    acc.paid.plus(r.paid),
    balance: acc.balance.plus(r.balance),
  }), {
    rent:    new Prisma.Decimal(0),
    paid:    new Prisma.Decimal(0),
    balance: new Prisma.Decimal(0),
  });

  const payload = {
    camp: campRef(camp),
    totals: {
      rent:    totals.rent.toNumber(),
      paid:    totals.paid.toNumber(),
      balance: totals.balance.toNumber(),
    },
  };

  if (groupBy === 'entity_group') {
    const grouped = new Map();
    for (const r of records) {
      const key = r.companies?.entity_group_name || r.companies?.name
               || r.individuals?.owner_name || r.owner_name
               || r.company_name || 'Other';
      if (!grouped.has(key)) {
        grouped.set(key, {
          entity_group_name: key,
          rent:    new Prisma.Decimal(0),
          paid:    new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
          room_count: 0,
        });
      }
      const g = grouped.get(key);
      g.rent    = g.rent.plus(r.rent);
      g.paid    = g.paid.plus(r.paid);
      g.balance = g.balance.plus(r.balance);
      g.room_count += 1;
    }
    payload.records = Array.from(grouped.values())
      .map((g) => ({
        entity_group_name: g.entity_group_name,
        room_count: g.room_count,
        rent:    g.rent.toNumber(),
        paid:    g.paid.toNumber(),
        balance: g.balance.toNumber(),
      }))
      .sort((a, b) => b.balance - a.balance);
  } else {
    payload.records = records.map((r) => ({
      sr_number:     r.rooms?.sr_number,
      room_number:   r.rooms?.room_number,
      block:         r.rooms?.blocks?.code,
      floor:         r.rooms?.blocks?.floor_label,
      tenant_name:   r.companies?.name || r.individuals?.owner_name || r.owner_name || r.company_name || '—',
      entity_group:  r.companies?.entity_group_name || null,
      contract_type: r.contract_type || '—',
      people_count:  r.people_count,
      rent:    Number(r.rent),
      paid:    Number(r.paid),
      balance: Number(r.balance),
      remarks: r.remarks || '',
    }));
  }

  return payload;
}

async function buildOccupancy(camp, groupBy) {
  const rooms = await prisma.rooms.findMany({
    where: { camp_id: camp.id, is_active: true },
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

  const statusCount = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    camp: campRef(camp),
    summary: {
      total:          rooms.length,
      leasable_rooms: camp.leasable_rooms,
      occupied:       statusCount.occupied || 0,
      vacant:         statusCount.vacant || 0,
      bartawi_use:    statusCount.bartawi_use || 0,
      maintenance:    statusCount.maintenance || 0,
      occupancy_rate: rooms.length > 0
        ? Number(((statusCount.occupied || 0) / rooms.length * 100).toFixed(1))
        : 0,
    },
  };

  if (groupBy === 'size') {
    const sizeGroups = rooms.reduce((acc, r) => {
      const size = r.room_size || 'small';
      if (!acc[size]) {
        acc[size] = { room_size: size, total: 0, occupied: 0, vacant: 0, bartawi_use: 0, maintenance: 0 };
      }
      acc[size].total += 1;
      acc[size][r.status] = (acc[size][r.status] || 0) + 1;
      return acc;
    }, {});

    payload.groups = Object.values(sizeGroups).map((g) => ({
      ...g,
      occupancy_rate: g.total > 0 ? Number(((g.occupied || 0) / g.total * 100).toFixed(1)) : 0,
    }));
  } else {
    payload.rooms = rooms.map((r) => ({
      room_number:      r.room_number,
      block:            r.blocks?.code,
      floor:            r.blocks?.floor_label,
      building:         r.buildings?.code,
      status:           r.status,
      room_type:        r.room_type,
      room_size:        r.room_size || 'small',
      max_capacity:     r.max_capacity,
      current_occupant: r.room_occupancy[0]?.companies?.name
                     || r.room_occupancy[0]?.individuals?.owner_name
                     || (r.status === 'bartawi_use' ? 'Bartawi LLC' : '—'),
      people_count:     r.room_occupancy[0]?.people_count || 0,
    }));
  }

  return payload;
}

async function buildOutstanding(camp, month, year, groupBy) {
  const records = await prisma.monthly_records.findMany({
    where: { camp_id: camp.id, month, year, balance: { gt: 0 } },
    include: {
      rooms: { include: { blocks: { select: { code: true } } } },
      companies: { select: { name: true, contact_phone: true, entity_group_name: true } },
      individuals: { select: { owner_name: true, mobile_number: true } },
    },
    orderBy: { balance: 'desc' }
  });

  const totalOutstanding = records.reduce(
    (sum, r) => sum.plus(r.balance),
    new Prisma.Decimal(0)
  );

  const payload = {
    camp: campRef(camp),
    total_outstanding: totalOutstanding.toNumber(),
    count: records.length,
  };

  if (groupBy === 'entity_group') {
    const grouped = new Map();
    for (const r of records) {
      const key = r.companies?.entity_group_name || r.companies?.name
               || r.individuals?.owner_name || r.owner_name
               || r.company_name || 'Other';
      if (!grouped.has(key)) {
        grouped.set(key, {
          entity_group_name: key,
          balance: new Prisma.Decimal(0),
          room_count: 0,
          contact: r.companies?.contact_phone || r.individuals?.mobile_number || '—',
        });
      }
      const g = grouped.get(key);
      g.balance = g.balance.plus(r.balance);
      g.room_count += 1;
    }
    payload.records = Array.from(grouped.values())
      .map((g) => ({
        entity_group_name: g.entity_group_name,
        room_count: g.room_count,
        balance:    g.balance.toNumber(),
        contact:    g.contact,
      }))
      .sort((a, b) => b.balance - a.balance);
  } else {
    payload.records = records.map((r) => ({
      room_number:  r.rooms?.room_number,
      block:        r.rooms?.blocks?.code,
      tenant_name:  r.companies?.name || r.individuals?.owner_name || r.company_name || r.owner_name || '—',
      entity_group: r.companies?.entity_group_name || null,
      contact:      r.companies?.contact_phone || r.individuals?.mobile_number || '—',
      rent:    Number(r.rent),
      paid:    Number(r.paid),
      balance: Number(r.balance),
      remarks: r.remarks || '',
    }));
  }

  return payload;
}

async function buildSummary(camp, month, year, groupBy) {
  const [records, rooms] = await Promise.all([
    prisma.monthly_records.findMany({
      where: { camp_id: camp.id, month, year },
      include: { rooms: { select: { room_size: true } } }
    }),
    prisma.rooms.findMany({
      where: { camp_id: camp.id, is_active: true },
      select: { status: true, room_size: true }
    }),
  ]);

  const statusCount = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const financials = records.reduce((acc, r) => ({
    total_rent:    acc.total_rent.plus(r.rent),
    total_paid:    acc.total_paid.plus(r.paid),
    total_balance: acc.total_balance.plus(r.balance),
  }), {
    total_rent:    new Prisma.Decimal(0),
    total_paid:    new Prisma.Decimal(0),
    total_balance: new Prisma.Decimal(0),
  });

  const leasable = camp.leasable_rooms || rooms.length;

  const payload = {
    camp: campRef(camp),
    occupancy: {
      total_rooms:    rooms.length,
      leasable_rooms: leasable,
      occupied:       statusCount.occupied || 0,
      vacant:         statusCount.vacant || 0,
      bartawi_use:    statusCount.bartawi_use || 0,
      occupancy_rate: leasable > 0
        ? Number(((statusCount.occupied || 0) / leasable * 100).toFixed(1))
        : 0,
    },
    financials: {
      total_rent:    financials.total_rent.toNumber(),
      total_paid:    financials.total_paid.toNumber(),
      total_balance: financials.total_balance.toNumber(),
      collection_rate: financials.total_rent.toNumber() > 0
        ? Number((financials.total_paid.toNumber() / financials.total_rent.toNumber() * 100).toFixed(1))
        : 0,
    },
  };

  if (groupBy === 'size') {
    const sizeGroups = new Map();
    for (const r of rooms) {
      const size = r.room_size || 'small';
      if (!sizeGroups.has(size)) {
        sizeGroups.set(size, {
          room_size: size, room_count: 0,
          occupied: 0, vacant: 0, bartawi_use: 0,
          rent:    new Prisma.Decimal(0),
          paid:    new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
        });
      }
      const g = sizeGroups.get(size);
      g.room_count += 1;
      g[r.status] = (g[r.status] || 0) + 1;
    }
    for (const r of records) {
      const size = r.rooms?.room_size || 'small';
      const g = sizeGroups.get(size);
      if (g) {
        g.rent    = g.rent.plus(r.rent);
        g.paid    = g.paid.plus(r.paid);
        g.balance = g.balance.plus(r.balance);
      }
    }
    payload.groups = Array.from(sizeGroups.values()).map((g) => ({
      room_size:       g.room_size,
      room_count:      g.room_count,
      occupied:        g.occupied || 0,
      vacant:          g.vacant || 0,
      bartawi_use:     g.bartawi_use || 0,
      occupancy_rate:  g.room_count > 0 ? Number(((g.occupied || 0) / g.room_count * 100).toFixed(1)) : 0,
      rent:    g.rent.toNumber(),
      paid:    g.paid.toNumber(),
      balance: g.balance.toNumber(),
      collection_rate: g.rent.toNumber() > 0 ? Number((g.paid.toNumber() / g.rent.toNumber() * 100).toFixed(1)) : 0,
    }));
  }

  return payload;
}

// ══════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// Each handler:
//   - Resolves camps via resolveCampIds
//   - Calls the appropriate builder for each camp
//   - Single-camp: returns existing shape at top level (backward compat)
//   - Multi-camp: wraps per-camp payloads in { camps: [...] }
// ══════════════════════════════════════════════════════════════════

router.get('/rent-roll',
  requirePermission('reports.read'),
  validate(reportQuerySchema, 'query'),
  async (req, res) => {
    const { month, year, groupBy } = req.validQuery;
    try {
      const { camps, isMulti, error } = await resolveCampIds(req.validQuery, req.tenantId);
      if (error) return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: error } });

      const perCamp = await Promise.all(camps.map((c) => buildRentRoll(c, month, year, groupBy)));

      if (!isMulti) {
        return res.json({
          report_type: 'rent_roll',
          ...perCamp[0],
          period: { month, year },
          generated_at: new Date().toISOString(),
        });
      }

      res.json({
        report_type: 'rent_roll',
        period: { month, year },
        camps: perCamp,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[reports/rent-roll] error:', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Operation failed' } });
    }
  }
);

router.get('/occupancy',
  requirePermission('reports.read'),
  validate(occupancyReportQuerySchema, 'query'),
  async (req, res) => {
    const { groupBy } = req.validQuery;
    try {
      const { camps, isMulti, error } = await resolveCampIds(req.validQuery, req.tenantId);
      if (error) return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: error } });

      const perCamp = await Promise.all(camps.map((c) => buildOccupancy(c, groupBy)));

      if (!isMulti) {
        return res.json({
          report_type: 'occupancy',
          ...perCamp[0],
          generated_at: new Date().toISOString(),
        });
      }

      res.json({
        report_type: 'occupancy',
        camps: perCamp,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[reports/occupancy] error:', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Operation failed' } });
    }
  }
);

router.get('/outstanding',
  requirePermission('reports.read'),
  validate(reportQuerySchema, 'query'),
  async (req, res) => {
    const { month, year, groupBy } = req.validQuery;
    try {
      const { camps, isMulti, error } = await resolveCampIds(req.validQuery, req.tenantId);
      if (error) return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: error } });

      const perCamp = await Promise.all(camps.map((c) => buildOutstanding(c, month, year, groupBy)));

      if (!isMulti) {
        return res.json({
          report_type: 'outstanding',
          ...perCamp[0],
          period: { month, year },
          generated_at: new Date().toISOString(),
        });
      }

      // Multi: aggregate grand totals across all camps for convenience
      const grandTotal = perCamp.reduce((s, c) => s + (c.total_outstanding || 0), 0);
      const grandCount = perCamp.reduce((s, c) => s + (c.count || 0), 0);

      res.json({
        report_type: 'outstanding',
        period: { month, year },
        total_outstanding: Number(grandTotal.toFixed(2)),
        count: grandCount,
        camps: perCamp,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[reports/outstanding] error:', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Operation failed' } });
    }
  }
);

router.get('/summary',
  requirePermission('reports.read'),
  validate(reportQuerySchema, 'query'),
  async (req, res) => {
    const { month, year, groupBy } = req.validQuery;
    try {
      const { camps, isMulti, error } = await resolveCampIds(req.validQuery, req.tenantId);
      if (error) return res.status(404).json({ error: { code: 'CAMP_NOT_FOUND', message: error } });

      const perCamp = await Promise.all(camps.map((c) => buildSummary(c, month, year, groupBy)));

      if (!isMulti) {
        return res.json({
          report_type: 'summary',
          ...perCamp[0],
          period: { month, year },
          generated_at: new Date().toISOString(),
        });
      }

      res.json({
        report_type: 'summary',
        period: { month, year },
        camps: perCamp,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[reports/summary] error:', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Operation failed' } });
    }
  }
);

export default router;
