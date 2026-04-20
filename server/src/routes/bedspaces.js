// Phase 4B.5: Bedspaces API routes
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────
// GET /api/v1/bedspaces/:bedspaceId
// Returns bedspace details with current lease and payment info
// ──────────────────────────────────────────────────────────────
router.get('/:bedspaceId', requirePermission('rooms.read'), async (req, res) => {
  const { bedspaceId } = req.params;
  const tenantId = req.tenantId;

  try {
    const bedspace = await prisma.bedspaces.findFirst({
      where: {
        id: bedspaceId,
        tenant_id: tenantId,
      },
      include: {
        room: {
          include: {
            camps: { select: { id: true, name: true, code: true } },
            blocks: { select: { id: true, code: true, floor_label: true } },
          },
        },
        leases: {
          where: { status: 'active' },
          include: {
            tenant: {
              select: {
                id: true,
                full_name: true,
                company_name: true,
                is_company: true,
              },
            },
          },
          orderBy: { start_date: 'desc' },
          take: 1,
        },
        monthly_records: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
          select: {
            id: true,
            month: true,
            year: true,
            rent: true,
            paid: true,
            balance: true,
          },
        },
      },
    });

    if (!bedspace) {
      return res.status(404).json({ error: { code: 'BEDSPACE_NOT_FOUND', message: 'Bedspace not found' } });
    }

    const activeLease = bedspace.leases?.[0] || null;

    const response = {
      id: bedspace.id,
      bed_number: bedspace.bed_number,
      position_x: bedspace.position_x ? Number(bedspace.position_x) : null,
      position_y: bedspace.position_y ? Number(bedspace.position_y) : null,
      capacity: bedspace.capacity,
      label: bedspace.label,
      notes: bedspace.notes,
      is_active: bedspace.is_active,
      room: {
        id: bedspace.room.id,
        room_number: bedspace.room.room_number,
        camp: bedspace.room.camps,
        block: bedspace.room.blocks,
      },
      active_lease: activeLease ? {
        id: activeLease.id,
        tenant: {
          id: activeLease.tenant.id,
          display_name: activeLease.tenant.is_company
            ? activeLease.tenant.company_name
            : activeLease.tenant.full_name,
          is_company: activeLease.tenant.is_company,
        },
        start_date: activeLease.start_date,
        end_date: activeLease.end_date,
        monthly_rent: Number(activeLease.monthly_rent),
        deposit_amount: Number(activeLease.deposit_amount),
        deposit_paid: Number(activeLease.deposit_paid),
        status: activeLease.status,
      } : null,
      payment_history: bedspace.monthly_records.map(rec => ({
        id: rec.id,
        month: rec.month,
        year: rec.year,
        rent: Number(rec.rent),
        paid: Number(rec.paid),
        balance: Number(rec.balance),
      })),
    };

    res.json(response);
  } catch (err) {
    console.error('[bedspaces/get] error:', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch bedspace' } });
  }
});

export default router;
