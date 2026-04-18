import express from 'express';
import prisma from '../lib/prisma.js';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as campsController from '../controllers/campsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/camps - list all camps for the tenant
router.get('/', campsController.getAllCamps);

// GET /api/v1/camps/:campId — single camp detail with blocks
router.get('/:campId', async (req, res) => {
  const tenantId = req.tenantId;
  const { campId } = req.params;

  try {
    const camp = await prisma.camps.findFirst({
      where: { id: campId, tenant_id: tenantId },
    });

    if (!camp) {
      return res.status(404).json({
        success: false,
        error: { code: 'CAMP_NOT_FOUND', message: 'Camp not found' }
      });
    }

    // Get blocks with room count aggregation
    const blocks = await prisma.blocks.findMany({
      where: { camp_id: campId },
      orderBy: { code: 'asc' },
    });

    // Get per-block room stats
    const blockStats = await Promise.all(blocks.map(async (b) => {
      const rooms = await prisma.rooms.findMany({
        where: { block_id: b.id },
        select: { status: true },
      });
      const occupied = rooms.filter(r => r.status === 'occupied' || r.status === 'vacating').length;
      const vacant = rooms.filter(r => r.status === 'vacant').length;

      return {
        id: b.id,
        code: b.code,
        floor_label: b.floor_label,
        room_count: rooms.length,
        occupied_count: occupied,
        vacant_count: vacant,
      };
    }));

    res.json({
      ...camp,
      blocks: blockStats,
    });
  } catch (err) {
    console.error('[camps/detail] error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to fetch camp' }
    });
  }
});

// GET /api/camps/:campId/dashboard - occupancy stats + financial summary
router.get('/:campId/dashboard', campsController.getCampDashboard);

// GET /api/camps/:campId/buildings - all buildings with blocks and room counts
router.get('/:campId/buildings', campsController.getCampBuildings);

// GET /api/camps/:campId/rooms - all rooms for a camp with current status
router.get('/:campId/rooms', campsController.getCampRooms);

// GET /api/v1/camps/:campId/latest-month — returns latest month/year with data
router.get('/:campId/latest-month', async (req, res) => {
  const tenantId = req.tenantId;
  const { campId } = req.params;

  try {
    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: { id: campId, tenant_id: tenantId },
    });

    if (!camp) {
      return res.status(404).json({
        error: { code: 'CAMP_NOT_FOUND', message: 'Camp not found' }
      });
    }

    // Get latest month with data
    const latest = await prisma.monthly_records.findFirst({
      where: { camp_id: campId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { month: true, year: true },
    });

    if (!latest) {
      // No data yet, return current month as fallback
      const now = new Date();
      return res.json({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
    }

    res.json({
      month: latest.month,
      year: latest.year,
    });
  } catch (err) {
    console.error('[camps/latest-month] error:', err);
    res.status(500).json({
      error: { code: 'INTERNAL', message: 'Failed to fetch latest month' }
    });
  }
});

export default router;
