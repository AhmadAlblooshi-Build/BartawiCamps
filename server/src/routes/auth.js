import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid input', details: parsed.error.flatten() } });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.users.findFirst({
      where: { email: email.toLowerCase(), is_active: true },
      include: {
        user_roles_user_roles_user_idTousers: {
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: { permissions: true }
                }
              }
            }
          }
        }
      }
    });
    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Flatten permissions into array of "resource.action" strings
    const permissions = [];
    for (const ur of user.user_roles_user_roles_user_idTousers) {
      for (const rp of ur.roles.role_permissions) {
        permissions.push(`${rp.permissions.resource}.${rp.permissions.action}`);
      }
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = jwt.sign(
      { sub: user.id, tenantId: user.tenant_id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        permissions
      }
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Login failed' } });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName,
    permissions: Array.from(req.user.permissions),
  });
});

export default router;
