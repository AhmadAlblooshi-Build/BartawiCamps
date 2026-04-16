// server/src/routes/roles.js
import express from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', requirePermission('admin.users'), async (req, res) => {
  const roles = await prisma.roles.findMany({
    where: { tenant_id: req.tenantId },
    include: {
      role_permissions: { include: { permissions: true } },
      _count: { select: { user_roles: true } },
    },
    orderBy: [{ is_system: 'desc' }, { name: 'asc' }],
  })

  res.json({
    data: roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      is_system: r.is_system,
      permissions: r.role_permissions.map(rp => `${rp.permissions.resource}.${rp.permissions.action}`),
      user_count: r._count.user_roles,
    })),
  })
})

export default router
