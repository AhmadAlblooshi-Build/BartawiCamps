// server/src/routes/featureFlags.js
import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../lib/validate.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const flags = await prisma.feature_flags.findMany({
    where: { tenant_id: req.tenantId },
    orderBy: { flag_key: 'asc' },
  })
  res.json({
    data: flags.map(f => ({
      key:         f.flag_key,
      name:        f.flag_name,
      description: f.description,
      enabled:     f.is_enabled,
      config:      f.config,
    })),
  })
})

const updateSchema = z.object({ enabled: z.boolean() })

router.patch('/:key',
  requirePermission('admin.settings'),
  validate(updateSchema),
  async (req, res) => {
    const flag = await prisma.feature_flags.upsert({
      where: { tenant_id_flag_key: { tenant_id: req.tenantId, flag_key: req.params.key } },
      update: { is_enabled: req.valid.enabled, enabled_at: new Date(), enabled_by: req.user.id },
      create: { tenant_id: req.tenantId, flag_key: req.params.key, is_enabled: req.valid.enabled },
    })
    res.json({ key: flag.flag_key, enabled: flag.is_enabled })
  }
)

export default router
