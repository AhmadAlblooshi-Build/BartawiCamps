import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required');
}

/**
 * Verifies JWT from Authorization header, loads user + tenant + permissions.
 * Populates req.user = { id, tenantId, email, permissions: Set<string> }
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    }

    // Load user with roles → permissions
    const user = await prisma.users.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.is_active) {
      return res.status(401).json({ error: { code: 'USER_INACTIVE', message: 'User not found or inactive' } });
    }

    // Flatten permissions into a Set of "resource.action" strings
    const permissions = new Set();
    for (const ur of user.user_roles_user_roles_user_idTousers) {
      for (const rp of ur.roles.role_permissions) {
        permissions.add(`${rp.permissions.resource}.${rp.permissions.action}`);
      }
    }

    req.user = {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      fullName: user.full_name,
      permissions,
    };
    req.tenantId = user.tenant_id;  // shortcut for handlers

    next();
  } catch (err) {
    console.error('[auth] middleware error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Authentication failed' } });
  }
}

/**
 * Requires a specific permission (e.g. 'contracts.write').
 * Must be used after requireAuth.
 */
export function requirePermission(permKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Auth required' } });
    }
    if (!req.user.permissions.has(permKey)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Missing permission: ${permKey}` } });
    }
    next();
  };
}
