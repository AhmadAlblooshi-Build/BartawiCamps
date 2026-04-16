import express from 'express';
import prisma from '../lib/prisma.js';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import { requirePermission } from '../middleware/auth.js';
import * as roomsController from '../controllers/roomsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// ──────────────────────────────────────────────────────────────
// Shared helper: verify a room belongs to the current tenant.
// Rooms scope through camps.tenant_id (no tenant_id column on rooms).
// Returns the room object if ownership is valid, otherwise null.
// ──────────────────────────────────────────────────────────────
async function findTenantRoom(roomId, tenantId) {
  const room = await prisma.rooms.findFirst({
    where: { id: roomId },
    include: { camps: { select: { tenant_id: true } } },
  });
  if (!room || room.camps?.tenant_id !== tenantId) return null;
  return room;
}

// ──────────────────────────────────────────────────────────────
// GET /api/v1/rooms
// List rooms with optional filters. Used by map view, rooms page,
// and dashboard widgets.
// ──────────────────────────────────────────────────────────────
router.get('/', requirePermission('rooms.read'), async (req, res) => {
  const tenantId = req.tenantId;
  const {
    camp_id,
    status,
    block_id,
    room_size,
    has_balance,
    q,
    limit = '100',
    offset = '0',
  } = req.query;

  try {
    // Build where clause — rooms scope through camps.tenant_id
    const where = {
      camps: { tenant_id: tenantId },
      ...(camp_id ? { camp_id: String(camp_id) } : {}),
      ...(status && status !== 'all' ? { status: String(status) } : {}),
      ...(block_id ? { block_id: String(block_id) } : {}),
      ...(room_size ? { room_size: String(room_size) } : {}),
      ...(q ? {
        OR: [
          { room_number: { contains: String(q), mode: 'insensitive' } },
        ]
      } : {}),
    };

    const take = Math.min(Number(limit) || 100, 500);
    const skip = Number(offset) || 0;

    const [rooms, total] = await Promise.all([
      prisma.rooms.findMany({
        where,
        include: {
          blocks: { select: { id: true, code: true, floor_label: true } },
          property_types: { select: { id: true, name: true, slug: true } },
          room_occupancy: {
            where: { is_current: true },
            take: 1,
            include: {
              individuals: {
                select: {
                  id: true, owner_name: true, full_name: true,
                  mobile_number: true, nationality: true,
                  emergency_contact_name: true, emergency_contact_phone: true,
                }
              },
              companies: {
                select: { id: true, name: true, contact_person: true }
              },
              contracts: {
                select: {
                  id: true, contract_type: true, end_date: true, status: true
                }
              },
            },
          },
        },
        orderBy: { room_number: 'asc' },
        take,
        skip,
      }),
      prisma.rooms.count({ where }),
    ]);

    // Flatten the response for frontend consumption
    const data = rooms.map((r) => {
      const occ = r.room_occupancy?.[0] || null;
      return {
        id: r.id,
        camp_id: r.camp_id,
        room_number: r.room_number,
        status: r.status,
        room_size: r.room_size,
        room_type: r.room_type,
        standard_rent: r.standard_rent ? Number(r.standard_rent) : null,
        max_capacity: r.max_capacity,
        block: r.blocks ? { id: r.blocks.id, code: r.blocks.code, floor_label: r.blocks.floor_label } : null,
        property_type: r.property_types ? { id: r.property_types.id, name: r.property_types.name, slug: r.property_types.slug } : null,
        fp_x: r.fp_x ? Number(r.fp_x) : null,
        fp_y: r.fp_y ? Number(r.fp_y) : null,
        fp_width: r.fp_width ? Number(r.fp_width) : null,
        fp_height: r.fp_height ? Number(r.fp_height) : null,
        current_occupancy: occ ? {
          id: occ.id,
          check_in_date: occ.check_in_date,
          people_count: occ.people_count,
          monthly_rent: occ.monthly_rent ? Number(occ.monthly_rent) : null,
          status: occ.status,
          individual: occ.individuals || null,
          company: occ.companies || null,
          contract: occ.contracts || null,
        } : null,
      };
    });

    res.json({
      data,
      pagination: {
        total,
        limit: take,
        offset: skip,
        has_more: skip + take < total,
      },
    });
  } catch (err) {
    console.error('[rooms/list] error:', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch rooms' } });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/v1/rooms/:roomId/balance
// Returns total outstanding balance + monthly breakdown (up to 24 months).
// ──────────────────────────────────────────────────────────────
router.get('/:roomId/balance', requirePermission('rooms.read'), async (req, res) => {
  const { roomId } = req.params;
  const tenantId = req.tenantId;

  try {
    const room = await findTenantRoom(roomId, tenantId);
    if (!room) {
      return res.status(404).json({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    }

    const unpaid = await prisma.monthly_records.findMany({
      where: { room_id: roomId, balance: { gt: 0 } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 24,
      select: { month: true, year: true, balance: true, rent: true, paid: true },
    });

    const total = unpaid.reduce((sum, r) => sum + Number(r.balance), 0);

    res.json({
      room_id: roomId,
      outstanding: Number(total.toFixed(2)),
      by_month: unpaid.map((r) => ({
        month: r.month,
        year: r.year,
        balance: Number(r.balance),
        rent: Number(r.rent),
        paid: Number(r.paid),
      })),
    });
  } catch (err) {
    console.error('[rooms/balance] error:', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch balance' } });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/v1/rooms/:roomId/history
// Returns the last 6 months of monthly_records for this room.
// ──────────────────────────────────────────────────────────────
router.get('/:roomId/history', requirePermission('rooms.read'), async (req, res) => {
  const { roomId } = req.params;
  const tenantId = req.tenantId;

  try {
    const room = await findTenantRoom(roomId, tenantId);
    if (!room) {
      return res.status(404).json({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    }

    const records = await prisma.monthly_records.findMany({
      where: { room_id: roomId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
      select: {
        id: true,
        month: true,
        year: true,
        rent: true,
        paid: true,
        balance: true,
        company_name: true,
        owner_name: true,
        contract_type: true,
      },
    });

    res.json({ data: records });
  } catch (err) {
    console.error('[rooms/history] error:', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch history' } });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/v1/rooms/:roomId
// Full room details. Must come AFTER more specific :roomId/* routes.
// ──────────────────────────────────────────────────────────────
router.get('/:roomId', roomsController.getRoomDetails);

export default router;
