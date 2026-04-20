import express from 'express'
import prisma from '../lib/prisma.js'
import { z } from 'zod'

const router = express.Router()

const BARTAWI_TENANT_ID = process.env.BARTAWI_TENANT_ID || 'a17e9d40-a011-a14e-0b0e-67b0a0dbc71f'

// ---------- schemas ----------

const CreateTenantSchema = z.object({
  is_company: z.boolean().default(false),
  full_name: z.string().trim().min(2).nullable().optional(),
  company_name: z.string().trim().min(2).nullable().optional(),
  mobile: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  id_type: z.enum(['emirates_id', 'passport', 'driver_license', 'other']).optional().nullable(),
  id_number: z.string().trim().optional().nullable(),
  emergency_contact_name: z.string().trim().optional().nullable(),
  emergency_contact_phone: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  d => (d.is_company ? !!d.company_name : !!d.full_name),
  { message: 'Individual requires full_name; company requires company_name' }
)

const CreateLeaseSchema = z.object({
  room_tenant_id: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  ),
  room_id: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  ),
  start_date: z.string(),                // ISO date
  end_date: z.string().nullable().optional(),
  monthly_rent: z.coerce.number().positive(),
  deposit_amount: z.coerce.number().min(0).default(0),
  contract_type: z.enum(['monthly', 'yearly']).default('monthly'),
  schedule_months: z.coerce.number().int().min(1).max(60).default(12),
  notes: z.string().optional().nullable(),
})

// ---------- GET /api/v1/leases — list with filters ----------

router.get('/', async (req, res) => {
  try {
    const { status, q, camp_id } = req.query

    const where = { saas_tenant_id: BARTAWI_TENANT_ID }

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim())
      where.status = { in: statuses }
    }

    if (q && String(q).trim()) {
      const qs = String(q).trim()
      where.OR = [
        { tenant: { full_name: { contains: qs, mode: 'insensitive' } } },
        { tenant: { company_name: { contains: qs, mode: 'insensitive' } } },
        { room: { room_number: { contains: qs, mode: 'insensitive' } } },
      ]
    }

    if (camp_id) {
      where.room = { ...where.room, camp_id: String(camp_id) }
    }

    const leases = await prisma.leases.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, full_name: true, company_name: true, is_company: true },
        },
        room: {
          select: {
            id: true,
            room_number: true,
            camp_id: true,
            blocks: { select: { code: true, camps: { select: { name: true } } } },
          },
        },
        monthly_records: {
          select: { balance: true, month: true, year: true, paid: true, rent: true },
        },
      },
      orderBy: [{ created_at: 'desc' }],
      take: 500,
    })

    const serialized = leases.map(l => {
      const totalOutstanding = (l.monthly_records || []).reduce(
        (sum, r) => sum + Math.max(0, Number(r.balance || 0)),
        0
      )
      const tenantName = l.tenant?.is_company
        ? l.tenant.company_name
        : l.tenant?.full_name

      return {
        id: l.id,
        status: l.status,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: Number(l.monthly_rent),
        deposit_amount: Number(l.deposit_amount),
        deposit_paid: Number(l.deposit_paid),
        contract_type: l.contract_type,
        created_at: l.created_at,
        tenant_id: l.room_tenant_id,
        tenant_name: tenantName,
        tenant_is_company: l.tenant?.is_company || false,
        room_id: l.room_id,
        room_number: l.room?.room_number,
        camp_id: l.room?.camp_id,
        camp_name: l.room?.blocks?.camps?.name,
        block_code: l.room?.blocks?.code,
        total_outstanding: totalOutstanding,
        records_count: (l.monthly_records || []).length,
      }
    })

    const counts = {
      all: serialized.length,
      active: serialized.filter(l => l.status === 'active').length,
      draft: serialized.filter(l => l.status === 'draft').length,
      expired: serialized.filter(l => l.status === 'expired').length,
      closed: serialized.filter(l => l.status === 'closed').length,
      terminated: serialized.filter(l => l.status === 'terminated').length,
    }

    res.json({ leases: serialized, counts })
  } catch (err) {
    console.error('Lease list failed:', err)
    res.status(500).json({ error: 'lease_list_failed', message: err?.message })
  }
})

// ---------- POST /api/v1/leases — create lease (draft state) ----------

router.post('/', async (req, res) => {
  const parse = CreateLeaseSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parse.error.issues })
  }
  const d = parse.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate room exists and belongs to SaaS tenant (rooms scope through camps.tenant_id)
      const room = await tx.rooms.findFirst({
        where: {
          id: d.room_id,
          camps: { tenant_id: BARTAWI_TENANT_ID }
        },
        include: { blocks: true },
      })
      if (!room) throw { code: 404, msg: 'room_not_found' }

      // 2. Validate room_tenant exists
      const rt = await tx.room_tenants.findFirst({
        where: { id: d.room_tenant_id, tenant_id: BARTAWI_TENANT_ID },
      })
      if (!rt) throw { code: 404, msg: 'room_tenant_not_found' }

      // 3. Availability check — no overlapping active lease on this room
      const start = new Date(d.start_date + 'T00:00:00Z')
      const end = d.end_date ? new Date(d.end_date + 'T00:00:00Z') : null

      const overlap = await tx.leases.findFirst({
        where: {
          saas_tenant_id: BARTAWI_TENANT_ID,  // Scope to current SaaS tenant
          room_id: d.room_id,
          status: 'active',
          OR: [
            // Existing lease starts before new lease ends (or open-ended)
            end
              ? { start_date: { lte: end }, OR: [{ end_date: null }, { end_date: { gte: start } }] }
              : { OR: [{ end_date: null }, { end_date: { gte: start } }] },
          ],
        },
        include: { tenant: true },
      })
      if (overlap) {
        const overlapName = overlap.tenant?.is_company
          ? overlap.tenant.company_name
          : overlap.tenant?.full_name
        throw {
          code: 409,
          msg: 'room_unavailable',
          details: {
            conflict_lease_id: overlap.id,
            conflict_tenant: overlapName,
            conflict_end_date: overlap.end_date,
          },
        }
      }

      // 4. Create lease in DRAFT status (not active yet — activation is separate)
      const lease = await tx.leases.create({
        data: {
          saas_tenant_id: BARTAWI_TENANT_ID,
          room_tenant_id: d.room_tenant_id,
          room_id: d.room_id,
          start_date: start,
          end_date: end,
          monthly_rent: d.monthly_rent,
          deposit_amount: d.deposit_amount,
          deposit_paid: 0,
          contract_type: d.contract_type,
          status: 'draft',       // starts as draft, flipped to active via POST /leases/:id/activate
        },
      })

      return { lease, room, rt, scheduleMonths: d.schedule_months }
    })

    res.status(201).json({ lease: result.lease })
  } catch (err) {
    if (err.code && err.msg) return res.status(err.code).json({ error: err.msg, ...err })
    console.error('Lease creation failed:', err)
    return res.status(500).json({ error: 'lease_creation_failed', message: err?.message })
  }
})

// ---------- POST /api/v1/leases/:id/activate ----------
// Generates payment schedule (future monthly_records) and flips lease status to active.
// Updates room.status to occupied. Single transaction.

router.post('/:id/activate', async (req, res) => {
  const leaseId = req.params.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lease = await tx.leases.findFirst({
        where: { id: leaseId, saas_tenant_id: BARTAWI_TENANT_ID },
        include: { room: true, tenant: true },
      })
      if (!lease) throw { code: 404, msg: 'lease_not_found' }

      if (lease.status === 'active') {
        // Idempotent — already active, return success without doing anything
        return { lease, created: 0, alreadyActive: true }
      }
      if (lease.status !== 'draft') {
        throw { code: 400, msg: 'lease_not_in_draft_state', currentStatus: lease.status }
      }

      // Re-verify availability at activation time (another tx may have leased the room)
      const overlap = await tx.leases.findFirst({
        where: {
          saas_tenant_id: BARTAWI_TENANT_ID,  // Scope to current SaaS tenant
          room_id: lease.room_id,
          status: 'active',
          id: { not: lease.id },
          OR: [
            lease.end_date
              ? {
                  start_date: { lte: lease.end_date },
                  OR: [{ end_date: null }, { end_date: { gte: lease.start_date } }],
                }
              : { OR: [{ end_date: null }, { end_date: { gte: lease.start_date } }] },
          ],
        },
      })
      if (overlap) {
        throw { code: 409, msg: 'room_became_unavailable' }
      }

      // Generate payment schedule — create monthly_records from start_date forward
      const startDate = new Date(lease.start_date)
      const endDate = lease.end_date ? new Date(lease.end_date) : null

      // Determine how many months to schedule
      let monthsToCreate = 12  // default month-to-month lookahead
      if (endDate) {
        const months =
          (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
          (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1
        monthsToCreate = Math.max(1, months)
      }

      let created = 0
      for (let i = 0; i < monthsToCreate; i++) {
        const d = new Date(Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth() + i,
          1
        ))
        const month = d.getUTCMonth() + 1
        const year = d.getUTCFullYear()

        // Check if ANY record exists for this room + month + year
        // (DB constraint is on room_id, not lease_id — rooms change tenants over time)
        const existing = await tx.monthly_records.findFirst({
          where: {
            room_id: lease.room_id,
            month,
            year,
          },
        })

        if (existing) {
          const paidAmount = Number(existing.paid || 0)

          if (paidAmount === 0 && !existing.is_locked) {
            // Unpaid and unlocked — safe to reassign to new lease
            await tx.monthly_records.update({
              where: { id: existing.id },
              data: {
                lease_id: lease.id,
                room_tenant_id: lease.room_tenant_id,
                rent: Number(lease.monthly_rent),
                owner_name: lease.tenant?.full_name || null,
                company_name: lease.tenant?.company_name || null,
                contract_type: lease.contract_type,
                contract_start_date: lease.start_date,
                contract_end_date: lease.end_date,
              },
            })
            created++
          }
          // else: locked or has payments — preserve audit trail, skip
          continue
        }

        // No existing record — create fresh
        await tx.monthly_records.create({
          data: {
            // NO tenant_id — not on monthly_records
            room_id: lease.room_id,
            camp_id: lease.room.camp_id,
            lease_id: lease.id,
            room_tenant_id: lease.room_tenant_id,
            month,
            year,
            rent: Number(lease.monthly_rent),
            paid: 0,
            owner_name: lease.tenant?.full_name || null,
            company_name: lease.tenant?.company_name || null,
            contract_type: lease.contract_type,
            contract_start_date: lease.start_date,
            contract_end_date: lease.end_date,
            people_count: null,
            off_days: 0,
            remarks: null,
            is_locked: false,
          },
        })
        created++
      }

      // Flip lease to active
      const updated = await tx.leases.update({
        where: { id: lease.id },
        data: { status: 'active' },
      })

      // Update room status to occupied (if rooms table has a status column)
      try {
        await tx.rooms.update({
          where: { id: lease.room_id },
          data: { status: 'occupied' },
        })
      } catch (_) {
        // If rooms.status doesn't exist, silently skip — not critical to activation
      }

      return { lease: updated, created, alreadyActive: false }
    })

    res.status(200).json({
      lease: result.lease,
      scheduled_months: result.created,
      already_active: result.alreadyActive,
    })
  } catch (err) {
    if (err.code && err.msg) return res.status(err.code).json({ error: err.msg, ...err })
    console.error('Lease activation failed:', err)
    return res.status(500).json({ error: 'activation_failed', message: err?.message })
  }
})

// ---------- DELETE /api/v1/leases/:id (draft only, for wizard cancel) ----------

router.delete('/:id', async (req, res) => {
  try {
    const lease = await prisma.leases.findFirst({
      where: { id: req.params.id, saas_tenant_id: BARTAWI_TENANT_ID },
    })
    if (!lease) return res.status(404).json({ error: 'lease_not_found' })
    if (lease.status !== 'draft') {
      return res.status(400).json({ error: 'cannot_delete_non_draft', currentStatus: lease.status })
    }

    // Hard delete — draft leases have no dependent data (no payments, no records)
    await prisma.leases.delete({ where: { id: lease.id } })
    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('Lease delete failed:', err)
    res.status(500).json({ error: 'delete_failed' })
  }
})

export default router
