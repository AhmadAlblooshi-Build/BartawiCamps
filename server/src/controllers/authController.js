import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * POST /api/auth/login
 * User login with email and password
 */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.users.findFirst({
      where: {
        email: email.toLowerCase(),
        is_active: true,
      },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
            is_active: true,
          },
        },
        user_roles_user_roles_user_idTousers: {
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify tenant is active
    if (!user.tenants.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Extract permissions
    const permissions = [];
    user.user_roles_user_roles_user_idTousers.forEach((userRole) => {
      userRole.roles.role_permissions.forEach((rolePerm) => {
        permissions.push({
          resource: rolePerm.permissions.resource,
          action: rolePerm.permissions.action,
        });
      });
    });

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          tenant: user.tenants,
        },
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Find user
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.userId,
        is_active: true,
      },
      include: {
        user_roles_user_roles_user_idTousers: {
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    // Extract permissions
    const permissions = [];
    user.user_roles_user_roles_user_idTousers.forEach((userRole) => {
      userRole.roles.role_permissions.forEach((rolePerm) => {
        permissions.push({
          resource: rolePerm.permissions.resource,
          action: rolePerm.permissions.action,
        });
      });
    });

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
export const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing tokens
    // Here we just return success
    // In production, you might want to implement token blacklisting

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user_roles_user_roles_user_idTousers: {
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message,
    });
  }
};
