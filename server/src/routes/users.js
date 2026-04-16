// server/src/routes/users.js
import express from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../lib/validate.js'
import { sendInviteEmail } from '../lib/mailer.js'

const router = express.Router()
router.use(requireAuth)

// ────────────────────────────────────────────────────────────────────
// GET /users
// ────────────────────────────────────────────────────────────────────
router.get('/', requirePermission('admin.users'), async (req, res) => {
  const users = await prisma.users.findMany({
    where: { tenant_id: req.tenantId },
    include: {
      user_roles_user_roles_user_idTousers: {
        include: { roles: { select: { id: true, name: true } } },
        take: 1,
        orderBy: { assigned_at: 'desc' },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  res.json({
    data: users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      custom_permissions: u.custom_permissions || [],
      role: u.user_roles_user_roles_user_idTousers[0]?.roles || null,
      role_id: u.user_roles_user_roles_user_idTousers[0]?.roles?.id || null,
    })),
  })
})

// ────────────────────────────────────────────────────────────────────
// POST /users/invite
// ────────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
  email:     z.string().email().toLowerCase().trim(),
  full_name: z.string().min(1).max(120),
  role_id:   z.string().uuid(),
})

router.post('/invite',
  requirePermission('admin.users'),
  validate(inviteSchema),
  async (req, res) => {
    const { email, full_name, role_id } = req.valid

    // Uniqueness check scoped to tenant
    const existing = await prisma.users.findFirst({
      where: { tenant_id: req.tenantId, email },
    })
    if (existing) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'A user with this email already exists' },
      })
    }

    // Validate role belongs to this tenant
    const role = await prisma.roles.findFirst({
      where: { id: role_id, tenant_id: req.tenantId },
    })
    if (!role) {
      return res.status(400).json({
        error: { code: 'INVALID_ROLE', message: 'Role not found or not accessible' },
      })
    }

    const tempPassword = crypto.randomBytes(12).toString('base64url')
    const password_hash = await bcrypt.hash(tempPassword, 10)
    const invite_token = crypto.randomBytes(24).toString('base64url')

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          tenant_id: req.tenantId,
          email,
          full_name,
          password_hash,
          is_active: true,
          invite_token,
          invite_sent_at: new Date(),
          must_reset_password: true,
        },
      })
      await tx.user_roles.create({
        data: { user_id: user.id, role_id, assigned_by: req.user.id },
      })
      return user
    })

    // Fire-and-forget email send
    sendInviteEmail({ to: email, full_name, token: invite_token, temp_password: tempPassword })
      .catch(err => console.error('[users/invite] mail', err))

    res.status(201).json({ id: result.id, email: result.email })
  }
)

// ────────────────────────────────────────────────────────────────────
// PATCH /users/:id
// ────────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  full_name:          z.string().min(1).max(120).optional(),
  role_id:            z.string().uuid().optional(),
  is_active:          z.boolean().optional(),
  custom_permissions: z.array(z.string()).optional(),
})

router.patch('/:id',
  requirePermission('admin.users'),
  validate(updateSchema),
  async (req, res) => {
    const user = await prisma.users.findFirst({
      where: { id: req.params.id, tenant_id: req.tenantId },
    })
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }

    // Prevent self-deactivation
    if (user.id === req.user.id && req.valid.is_active === false) {
      return res.status(400).json({
        error: { code: 'INVALID_OP', message: 'Cannot deactivate yourself' },
      })
    }

    // Validate new role if changed
    if (req.valid.role_id) {
      const role = await prisma.roles.findFirst({
        where: { id: req.valid.role_id, tenant_id: req.tenantId },
      })
      if (!role) {
        return res.status(400).json({
          error: { code: 'INVALID_ROLE', message: 'Role not found' },
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      // Role change = delete old, insert new
      if (req.valid.role_id) {
        await tx.user_roles.deleteMany({ where: { user_id: user.id } })
        await tx.user_roles.create({
          data: { user_id: user.id, role_id: req.valid.role_id, assigned_by: req.user.id },
        })
      }

      // Update other fields
      const { role_id, ...otherFields } = req.valid
      if (Object.keys(otherFields).length > 0) {
        await tx.users.update({
          where: { id: user.id },
          data: otherFields,
        })
      }
    })

    res.json({ id: user.id })
  }
)

export default router
