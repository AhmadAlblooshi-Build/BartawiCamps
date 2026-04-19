import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// ---------- GET /room-tenants — List with search and type filter ----------

router.get('/', async (req, res) => {
  const { search, type } = req.query;

  const where = {};

  // Search filter (full_name or company_name)
  if (search && typeof search === 'string') {
    where.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { company_name: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Type filter
  if (type === 'company') {
    where.is_company = true;
  } else if (type === 'individual') {
    where.is_company = false;
  }

  try {
    const tenants = await prisma.room_tenants.findMany({
      where,
      include: {
        leases: {
          include: {
            room: {
              select: {
                room_number: true,
              },
            },
          },
        },
      },
      orderBy: [
        { is_company: 'desc' },
        { company_name: 'asc' },
        { full_name: 'asc' },
      ],
    });

    // Serialize response
    const serialized = tenants.map(t => {
      const activeLeases = t.leases.filter(l => l.status === 'active');
      const monthlyRentTotal = activeLeases.reduce((sum, l) => sum + Number(l.monthly_rent || 0), 0);

      return {
        id: t.id,
        full_name: t.full_name,
        company_name: t.company_name,
        is_company: t.is_company,
        display_name: t.is_company ? t.company_name : t.full_name,
        phone: t.phone,
        email: t.email,
        total_leases: t.leases.length,
        active_leases: activeLeases.length,
        active_rooms_count: activeLeases.length, // Alias for clarity
        monthly_rent_total: monthlyRentTotal,
        active_rooms: activeLeases.map(l => ({
          room_id: l.room_id,
          room_number: l.room?.room_number,
          monthly_rent: Number(l.monthly_rent || 0),
        })),
      };
    });

    return res.json({ tenants: serialized });
  } catch (err) {
    console.error('Room tenants list failed:', err);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

// ---------- GET /room-tenants/:id — Detail with full lease and payment history ----------

router.get('/:id', async (req, res) => {
  try {
    const tenant = await prisma.room_tenants.findUnique({
      where: { id: req.params.id },
      include: {
        leases: {
          include: {
            room: {
              include: {
                blocks: {
                  select: { code: true, camp_id: true },
                },
              },
            },
            monthly_records: {
              select: {
                id: true,
                month: true,
                year: true,
                rent: true,
                paid: true,
                balance: true,
              },
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
            },
            payments: {
              where: { reversed: false },
              select: {
                id: true,
                amount: true,
                payment_date: true,
                method: true,
                payment_type: true,
                notes: true,
              },
              orderBy: { payment_date: 'desc' },
            },
          },
          orderBy: { start_date: 'desc' },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    // Serialize tenant with full nested history
    const serialized = {
      id: tenant.id,
      full_name: tenant.full_name,
      company_name: tenant.company_name,
      is_company: tenant.is_company,
      display_name: tenant.is_company ? tenant.company_name : tenant.full_name,
      phone: tenant.phone,
      email: tenant.email,
      national_id: tenant.national_id,
      trade_license: tenant.trade_license,
      contact_person: tenant.contact_person,
      created_at: tenant.created_at,

      leases: tenant.leases.map(l => ({
        id: l.id,
        room_number: l.room.room_number,
        block_code: l.room.blocks?.code,
        camp_id: l.room.blocks?.camp_id,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: Number(l.monthly_rent),
        contract_type: l.contract_type,
        status: l.status,
        deposit_amount: Number(l.deposit_amount),
        deposit_paid: Number(l.deposit_paid),
        total_records: l.monthly_records.length,
        total_payments: l.payments.length,
        payment_history: l.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          method: p.method,
          payment_type: p.payment_type,
          notes: p.notes,
        })),
        monthly_records: l.monthly_records.map(r => ({
          id: r.id,
          month: r.month,
          year: r.year,
          rent: Number(r.rent),
          paid: Number(r.paid),
          balance: Number(r.balance),
        })),
      })),
    };

    return res.json({ tenant: serialized });
  } catch (err) {
    console.error('Room tenant detail failed:', err);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

export default router;
