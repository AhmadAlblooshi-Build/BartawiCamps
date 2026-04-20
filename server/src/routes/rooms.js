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

// Month number → display name mapping
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function serializeRecord(r, synthesized = false) {
  return {
    id: r.id || null,                        // Phase 4A: monthly_record ID for payment linking
    month: r.month,                          // keep as number
    month_name: MONTH_NAMES[r.month],        // for display
    year: r.year,
    rent: Number(r.rent),                    // Decimal → Number
    paid: Number(r.paid),
    balance: Number(r.balance ?? 0),
    remarks: r.remarks,
    owner_name: r.owner_name,
    company_name: r.company_name,
    contract_type: r.contract_type,
    contract_start_date: r.contract_start_date ? r.contract_start_date.toISOString() : null,
    contract_end_date: r.contract_end_date ? r.contract_end_date.toISOString() : null,
    people_count: r.people_count,
    is_locked: r.is_locked ?? false,
    is_synthesized: synthesized,
    tenant: r.room_tenant || null,           // Phase 4A: room_tenants relation
    lease_id: r.lease_id || null,            // Phase 4A: lease FK
  };
}

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

    // Determine "current period" with fallback
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;  // JS months are 0-indexed, DB stores 1-12
    const currentYear = now.getFullYear();

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
          monthly_records: {
            include: {
              room_tenant: true,  // Phase 4A: relation to room_tenants
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 12,  // up to 12 months history, we'll slice to 3 for display
          },
          leases: {
            where: { status: 'active' },
            include: {
              tenant: true,  // Phase 4A: relation to room_tenants
              bedspace: { select: { id: true, bed_number: true } },  // Phase 4B.5
            },
            orderBy: { start_date: 'desc' },
          },
          bedspaces: {  // Phase 4B.5
            where: { is_active: true },
            orderBy: { bed_number: 'asc' },
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

      // Sort monthly_records by year/month descending
      const sortedRecords = (r.monthly_records || []).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      // Try explicit current month record
      let currentMonth = sortedRecords.find(rec =>
        rec.month === currentMonthNum && rec.year === currentYear
      );

      let synthesized = false;

      // If no current month record exists, check if room is "actively occupied"
      if (!currentMonth) {
        const mostRecent = sortedRecords[0];  // most recent (usually last month)

        // Room is considered occupied if:
        //   (a) there's a most-recent monthly record with tenant info, OR
        //   (b) room_occupancy relation exists (defensive fallback)
        const hasRecentTenant = !!(
          mostRecent && (mostRecent.owner_name || mostRecent.company_name)
        );
        const hasOccupancyRow = !!occ;

        const isOccupied = hasRecentTenant || hasOccupancyRow;

        if (isOccupied) {
          // Detect Bartawi rooms — skip synthesis for them
          const contractType = (mostRecent?.contract_type || '').toString().toLowerCase();
          const tenant = (mostRecent?.owner_name || mostRecent?.company_name || '').toString().toLowerCase();
          const bartawiKeywords = [
            'bartawi', 'bgc', 'camp boss', 'camp office', 'security room',
            'cleaners', 'mosque', 'bgc room', 'electricity room',
          ];
          const isBartawi =
            contractType.includes('bartawi') ||
            bartawiKeywords.some(kw => tenant.includes(kw)) ||
            (mostRecent && Number(mostRecent.rent) === 0);

          if (!isBartawi) {
            // Infer rent: most recent non-zero rent, or standard_rent fallback
            let inferredRent = 0;
            for (const rec of sortedRecords) {
              const rnum = Number(rec.rent) || 0;
              if (rnum > 0) {
                inferredRent = rnum;
                break;
              }
            }
            if (inferredRent === 0) {
              inferredRent = Number(r.standard_rent) || 0;
            }

            if (inferredRent > 0) {
              currentMonth = {
                month: currentMonthNum,
                year: currentYear,
                rent: inferredRent,
                paid: 0,
                balance: inferredRent,
                remarks: `Rent for ${MONTH_NAMES[currentMonthNum]} ${currentYear} not yet recorded`,
                owner_name: mostRecent?.owner_name || null,
                company_name: mostRecent?.company_name || null,
                contract_type: mostRecent?.contract_type || null,
                contract_start_date: mostRecent?.contract_start_date || null,
                contract_end_date: mostRecent?.contract_end_date || null,
                people_count: mostRecent?.people_count || 0,
                is_locked: false,
              };
              synthesized = true;
            }
          }
        }
      }

      const currentMonthSerialized = currentMonth
        ? serializeRecord(currentMonth, synthesized)
        : null;

      // History shows ONLY real DB records (last 3), not the synthesized one
      const history = sortedRecords.slice(0, 3).map(rec => serializeRecord(rec, false));

      // Build current_occupancy from room_occupancy
      let currentOccupancy = null;
      if (occ) {
        currentOccupancy = {
          id: occ.id,
          check_in_date: occ.check_in_date,
          people_count: occ.people_count,
          monthly_rent: occ.monthly_rent ? Number(occ.monthly_rent) : null,
          status: occ.status,
          individual: occ.individuals || null,
          company: occ.companies || null,
          contract: occ.contracts || null,
        };
      }

      // Phase 4A: Build active_lease from leases relation
      const activeLease = r.leases?.[0] || null;
      const activeLeaseData = activeLease ? {
        id: activeLease.id,
        tenant: activeLease.tenant,  // the room_tenants row
        start_date: activeLease.start_date,
        end_date: activeLease.end_date,
        monthly_rent: Number(activeLease.monthly_rent),
        deposit_amount: Number(activeLease.deposit_amount),
        deposit_paid: Number(activeLease.deposit_paid),
        contract_type: activeLease.contract_type,
        status: activeLease.status,
      } : null;

      // Phase 4B.5: Build bedspaces_state with per-bed occupancy
      const roomLevelLease = r.leases?.find(l => !l.bedspace_id) || null;
      const bedLevelLeases = r.leases?.filter(l => l.bedspace_id) || [];
      const hasRoomLevelLease = !!roomLevelLease;

      const bedspacesState = (r.bedspaces || []).map(bed => {
        const bedLease = bedLevelLeases.find(l => l.bedspace_id === bed.id);

        let status = 'vacant';
        let paymentStatus = 'vacant';
        let leaseId = null;
        let tenant = null;
        let currentMonthRecordId = null;

        // If room-level lease exists, it overrides all beds
        if (roomLevelLease) {
          status = 'occupied';
          paymentStatus = 'whole_room';
          leaseId = roomLevelLease.id;
          tenant = roomLevelLease.tenant ? {
            id: roomLevelLease.tenant.id,
            display_name: roomLevelLease.tenant.is_company
              ? roomLevelLease.tenant.company_name
              : roomLevelLease.tenant.full_name,
            is_company: roomLevelLease.tenant.is_company,
          } : null;
        } else if (bedLease) {
          // Bed-level lease
          status = 'occupied';
          leaseId = bedLease.id;
          tenant = bedLease.tenant ? {
            id: bedLease.tenant.id,
            display_name: bedLease.tenant.is_company
              ? bedLease.tenant.company_name
              : bedLease.tenant.full_name,
            is_company: bedLease.tenant.is_company,
          } : null;

          // Find current month record for this bed
          const bedRecord = r.monthly_records?.find(rec =>
            rec.bedspace_id === bed.id &&
            rec.month === currentMonthNum &&
            rec.year === currentYear
          );

          if (bedRecord) {
            currentMonthRecordId = bedRecord.id;
            const rentNum = Number(bedRecord.rent) || 0;
            const paidNum = Number(bedRecord.paid) || 0;
            const balanceNum = Number(bedRecord.balance) || 0;

            if (balanceNum <= 0) {
              paymentStatus = 'paid';
            } else if (paidNum > 0) {
              paymentStatus = 'partial';
            } else {
              paymentStatus = 'unpaid';
            }
          } else {
            paymentStatus = 'unpaid';  // No record = unpaid
          }
        }

        return {
          bedspace_id: bed.id,
          bed_number: bed.bed_number,
          position_x: bed.position_x ? Number(bed.position_x) : null,
          position_y: bed.position_y ? Number(bed.position_y) : null,
          status,
          payment_status: paymentStatus,
          lease_id: leaseId,
          tenant,
          current_month_record_id: currentMonthRecordId,
        };
      });

      const totalBeds = bedspacesState.length;
      const bedLevelCount = bedLevelLeases.length;

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
        current_occupancy: currentOccupancy,
        current_month: currentMonthSerialized,
        monthly_records: history,
        active_lease: activeLeaseData,  // Phase 4A: active lease with tenant
        bedspaces_state: bedspacesState,  // Phase 4B.5: per-bed state
        total_beds: totalBeds,  // Phase 4B.5
        bed_level_count: bedLevelCount,  // Phase 4B.5
        has_room_level_lease: hasRoomLevelLease,  // Phase 4B.5
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
// GET /api/v1/rooms/availability
// Phase 4B.5: Returns room-level AND bed-level availability state.
// Supports mixed occupancy (some beds leased, others vacant).
// ──────────────────────────────────────────────────────────────
router.get('/availability', requirePermission('rooms.read'), async (req, res) => {
  const tenantId = req.tenantId;
  const { campId, blockId, start_date, end_date } = req.query;

  if (!start_date) {
    return res.status(400).json({ error: 'start_date_required' });
  }

  const start = new Date(String(start_date) + 'T00:00:00Z');
  const end = end_date ? new Date(String(end_date) + 'T00:00:00Z') : null;

  try {
    const where = { camps: { tenant_id: tenantId } };
    if (campId) where.camp_id = String(campId);
    if (blockId) where.block_id = String(blockId);

    const rooms = await prisma.rooms.findMany({
      where,
      include: {
        blocks: { include: { camps: true } },
        property_types: { select: { name: true } },
        bedspaces: {
          where: { is_active: true },
          orderBy: { bed_number: 'asc' },
        },
        leases: {
          where: { status: 'active' },
          include: { tenant: true, bedspace: true },
        },
      },
      orderBy: [{ room_number: 'asc' }],
    });

    const available = [];
    const occupied = [];

    for (const r of rooms) {
      const propertyType = r.property_types?.name || r.property_type || '';
      const isBartawi = String(propertyType).toLowerCase().includes('bartawi');

      if (isBartawi) {
        occupied.push({
          room_id: r.id,
          room_number: r.room_number,
          camp_id: r.camp_id,
          camp_name: r.blocks?.camps?.name,
          block_id: r.block_id,
          block_code: r.blocks?.code,
          property_type: r.property_types?.name || r.property_type || null,
          status: 'bartawi',
          total_beds: 0,
          available_beds: 0,
          bed_state: [],
          room_level_lease: null,
          conflict: { reason: 'bartawi_service_room' },
        });
        continue;
      }

      // Find active room-level lease (bedspace_id === null)
      const roomLevelLease = r.leases.find(l => !l.bedspace_id);

      // Determine overlap with requested period for room-level lease
      let roomLevelOverlaps = false;
      if (roomLevelLease) {
        const ls = new Date(roomLevelLease.start_date);
        const le = roomLevelLease.end_date ? new Date(roomLevelLease.end_date) : null;
        if (!le) {
          roomLevelOverlaps = true;
        } else if (end) {
          roomLevelOverlaps = ls <= end && le >= start;
        } else {
          roomLevelOverlaps = le >= start;
        }
      }

      // Per-bed state
      const bedState = r.bedspaces.map(b => {
        const bedLease = r.leases.find(l => l.bedspace_id === b.id);
        let bedStatus = 'available';
        let conflict = null;

        if (bedLease) {
          const ls = new Date(bedLease.start_date);
          const le = bedLease.end_date ? new Date(bedLease.end_date) : null;
          let overlaps = false;
          if (!le) {
            overlaps = true;
          } else if (end) {
            overlaps = ls <= end && le >= start;
          } else {
            overlaps = le >= start;
          }

          if (overlaps) {
            bedStatus = 'occupied';
            const tenantName = bedLease.tenant?.is_company
              ? bedLease.tenant.company_name
              : bedLease.tenant?.full_name;
            conflict = {
              lease_id: bedLease.id,
              tenant_name: tenantName,
              lease_end_date: bedLease.end_date,
            };
          }
        }

        // If room-level lease overlaps, ALL beds marked occupied by that lease
        if (roomLevelOverlaps) {
          const tenantName = roomLevelLease.tenant?.is_company
            ? roomLevelLease.tenant.company_name
            : roomLevelLease.tenant?.full_name;
          bedStatus = 'occupied';
          conflict = {
            lease_id: roomLevelLease.id,
            tenant_name: tenantName,
            lease_end_date: roomLevelLease.end_date,
            reason: 'whole_room_leased',
          };
        }

        return {
          bedspace_id: b.id,
          bed_number: b.bed_number,
          status: bedStatus,
          conflict,
        };
      });

      const availableBedCount = bedState.filter(b => b.status === 'available').length;
      const totalBeds = bedState.length;

      const roomBase = {
        room_id: r.id,
        room_number: r.room_number,
        camp_id: r.camp_id,
        camp_name: r.blocks?.camps?.name,
        block_id: r.block_id,
        block_code: r.blocks?.code,
        property_type: r.property_types?.name || r.property_type || null,
        total_beds: totalBeds,
        available_beds: availableBedCount,
        bed_state: bedState,
        room_level_lease: roomLevelOverlaps ? {
          lease_id: roomLevelLease.id,
          tenant_name: roomLevelLease.tenant?.is_company
            ? roomLevelLease.tenant.company_name
            : roomLevelLease.tenant?.full_name,
          end_date: roomLevelLease.end_date,
        } : null,
      };

      // Bucket the room
      if (roomLevelOverlaps) {
        occupied.push({
          ...roomBase,
          status: 'occupied',
          conflict: {
            reason: 'whole_room_leased',
            lease_id: roomLevelLease.id,
            tenant_name: roomBase.room_level_lease.tenant_name,
          },
        });
      } else if (availableBedCount === 0 && totalBeds > 0) {
        occupied.push({
          ...roomBase,
          status: 'fully_bed_occupied',
          conflict: { reason: 'all_beds_occupied' },
        });
      } else if (availableBedCount > 0 && availableBedCount < totalBeds) {
        available.push({ ...roomBase, status: 'partial_vacancy', conflict: null });
      } else {
        // Fully available (no leases at all)
        available.push({ ...roomBase, status: 'available', conflict: null });
      }
    }

    res.json({
      available,
      occupied,
      total_available_rooms: available.length,
      total_occupied_rooms: occupied.length,
      total_available_beds: available.reduce((s, r) => s + r.available_beds, 0),
    });
  } catch (err) {
    console.error('Availability check failed:', err);
    res.status(500).json({ error: 'availability_failed' });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/v1/rooms/:roomId
// Full room details. Must come AFTER more specific :roomId/* routes.
// ──────────────────────────────────────────────────────────────
router.get('/:roomId', roomsController.getRoomDetails);

export default router;
