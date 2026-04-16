// server/src/routes/complaints.js (adapted for existing schema)
import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../lib/validate.js'

const router = express.Router()
router.use(requireAuth)

// Generate next complaint reference
async function nextComplaintRef() {
  const year = new Date().getFullYear()
  const prefix = 'BT-CMP-' + year + '-'
  const latest = await prisma.complaints.findFirst({
    where: { complaint_ref: { startsWith: prefix } },
    orderBy: { complaint_ref: 'desc' },
    select: { complaint_ref: true },
  })
  const n = latest ? parseInt(latest.complaint_ref.slice(prefix.length)) + 1 : 1
  return prefix + String(n).padStart(6, '0')
}

// Flatten mangled Prisma relation names
function flattenComplaint(c) {
  return Object.assign({}, c, {
    room: c.rooms,
    category: c.complaint_categories,
    reported_by: c.users_complaints_reported_by_userTousers,
    assigned_user: c.users_complaints_assigned_toTousers,
    rooms: undefined,
    complaint_categories: undefined,
    users_complaints_reported_by_userTousers: undefined,
    users_complaints_assigned_toTousers: undefined,
  })
}

// GET /complaints
const listQuery = z.object({
  status:   z.enum(['open', 'in_progress', 'resolved', 'closed', 'all']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  room_id:  z.string().uuid().optional(),
  camp_id:  z.string().uuid().optional(),
  limit:    z.coerce.number().min(1).max(500).default(100),
})

router.get('/',
  requirePermission('complaints.read'),
  validate(listQuery, 'query'),
  async (req, res) => {
    const opts = req.validQuery
    const where = {}
    if (opts.status && opts.status !== 'all') where.status = opts.status
    if (opts.priority) where.priority = opts.priority
    if (opts.room_id) where.room_id = opts.room_id
    if (opts.camp_id) where.camp_id = opts.camp_id

    const complaints = await prisma.complaints.findMany({
      where,
      include: {
        rooms:                                    { select: { id: true, room_number: true } },
        complaint_categories:                     { select: { id: true, name: true } },
        users_complaints_reported_by_userTousers: { select: { id: true, full_name: true } },
        users_complaints_assigned_toTousers:      { select: { id: true, full_name: true, email: true } },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { created_at: 'desc' },
      ],
      take: opts.limit,
    })
    res.json({ data: complaints.map(flattenComplaint) })
  }
)

// POST /complaints
const createSchema = z.object({
  title:         z.string().min(1).max(200),
  description:   z.string().min(1).max(4000),
  priority:      z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  room_number:   z.string().optional(),
  camp_id:       z.string().uuid().optional(),
  category_id:   z.string().uuid().optional(),
  category_name: z.string().optional(),
})

router.post('/',
  requirePermission('complaints.write'),
  validate(createSchema),
  async (req, res) => {
    const data = req.valid
    let roomId = null
    let campId = data.camp_id || null

    if (data.room_number) {
      const room = await prisma.rooms.findFirst({
        where: { tenant_id: req.tenantId, room_number: data.room_number },
        select: { id: true, camp_id: true },
      })
      if (room) {
        roomId = room.id
        campId = campId || room.camp_id
      }
    }

    if (!campId) {
      const defaultCamp = await prisma.camps.findFirst({
        where: { tenant_id: req.tenantId },
        select: { id: true },
      })
      if (defaultCamp) campId = defaultCamp.id
    }

    if (!campId) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'camp_id is required (no default camp found)' },
      })
    }

    let categoryId = data.category_id || null
    if (!categoryId && data.category_name) {
      const cat = await prisma.complaint_categories.findFirst({
        where: {
          tenant_id: req.tenantId,
          name: { equals: data.category_name, mode: 'insensitive' },
        },
      })
      if (cat) {
        categoryId = cat.id
      } else {
        const created = await prisma.complaint_categories.create({
          data: {
            tenant_id: req.tenantId,
            name: data.category_name,
          },
        })
        categoryId = created.id
      }
    }

    const complaint_ref = await nextComplaintRef()

    const complaint = await prisma.complaints.create({
      data: {
        complaint_ref,
        camp_id: campId,
        room_id: roomId,
        category_id: categoryId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'open',
        reported_by_user: req.user.id,
      },
      include: {
        rooms:                                    { select: { id: true, room_number: true } },
        complaint_categories:                     { select: { id: true, name: true } },
        users_complaints_reported_by_userTousers: { select: { id: true, full_name: true } },
      },
    })
    res.status(201).json(flattenComplaint(complaint))
  }
)

// PATCH /complaints/:id
const updateSchema = z.object({
  status:           z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority:         z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to:      z.string().uuid().nullable().optional(),
  resolution_notes: z.string().max(4000).optional(),
})

router.patch('/:id',
  requirePermission('complaints.resolve'),
  validate(updateSchema),
  async (req, res) => {
    const complaint = await prisma.complaints.findFirst({
      where: { id: req.params.id },
    })
    if (!complaint) {
      return res.status(404).json({ error: { code: 'NOT_FOUND' } })
    }

    const updates = Object.assign({}, req.valid)

    if (req.valid.status === 'resolved' && !complaint.resolved_at) {
      updates.resolved_at = new Date()
      updates.resolved_by = req.user.id
    }
    if (req.valid.status === 'closed' && !complaint.closed_at) {
      updates.closed_at = new Date()
    }

    const updated = await prisma.complaints.update({
      where: { id: complaint.id },
      data: updates,
      include: {
        rooms:                                    { select: { id: true, room_number: true } },
        complaint_categories:                     { select: { id: true, name: true } },
        users_complaints_assigned_toTousers:      { select: { id: true, full_name: true, email: true } },
      },
    })
    res.json(flattenComplaint(updated))
  }
)

export default router
