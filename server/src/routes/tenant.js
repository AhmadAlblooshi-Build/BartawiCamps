// server/src/routes/tenant.js
import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../lib/validate.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const tenant = await prisma.tenants.findFirst({
    where: { id: req.tenantId },
    select: {
      id: true, name: true, legal_name: true, slug: true,
      trn: true, created_at: true,
    },
  })
  if (!tenant) return res.status(404).json({ error: { code: 'NOT_FOUND' } })
  res.json(tenant)
})

const updateSchema = z.object({
  name:       z.string().min(1).max(120).optional(),
  legal_name: z.string().max(200).optional(),
  trn:        z.string().max(20).optional(),
})

router.patch('/',
  requirePermission('admin.settings'),
  validate(updateSchema),
  async (req, res) => {
    const updated = await prisma.tenants.update({
      where: { id: req.tenantId },
      data: req.valid,
    })
    res.json({ id: updated.id })
  }
)

export default router
