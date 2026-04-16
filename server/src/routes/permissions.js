// server/src/routes/permissions.js
import express from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', requirePermission('admin.users'), async (req, res) => {
  const perms = await prisma.permissions.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  })
  res.json({
    data: perms.map(p => ({
      id: p.id,
      key: `${p.resource}.${p.action}`,
      resource: p.resource,
      action: p.action,
      description: p.description,
    })),
  })
})

export default router
