import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * GET /api/users
 * List all users for the tenant
 */
export const getUsers = async (req, res) => {
  try {
    const { is_active, page = 1, limit = 50 } = req.query;

    // Build where clause
    const where = {
      tenant_id: req.tenantId,
    };

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.users.count({ where });

    // Fetch users
    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
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
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take,
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message,
    });
  }
};

/**
 * GET /api/users/:userId
 * Get single user details
 */
export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        tenant_id: req.tenantId,
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
        updated_at: true,
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
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message,
    });
  }
};

/**
 * POST /api/users
 * Create a new user
 */
export const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, full_name, phone, role_ids = [] } = req.body;

    // Check if email already exists
    const existing = await prisma.users.findFirst({
      where: {
        tenant_id: req.tenantId,
        email: email.toLowerCase(),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user with roles
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.users.create({
        data: {
          tenant_id: req.tenantId,
          email: email.toLowerCase(),
          password_hash,
          full_name,
          phone,
          is_active: true,
        },
      });

      // Assign roles
      if (role_ids.length > 0) {
        await tx.user_roles.createMany({
          data: role_ids.map((role_id) => ({
            user_id: newUser.id,
            role_id,
            // assigned_by: req.userId, // TODO: Set when available
          })),
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message,
    });
  }
};

/**
 * PUT /api/users/:userId
 * Update a user
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone, avatar_url, is_active, role_ids } = req.body;

    // Verify user exists and belongs to tenant
    const existing = await prisma.users.findFirst({
      where: {
        id: userId,
        tenant_id: req.tenantId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update user
    const updated = await prisma.$transaction(async (tx) => {
      // Update user fields
      const user = await tx.users.update({
        where: { id: userId },
        data: {
          full_name,
          phone,
          avatar_url,
          is_active,
          updated_at: new Date(),
        },
      });

      // Update roles if provided
      if (role_ids) {
        // Remove existing roles
        await tx.user_roles.deleteMany({
          where: { user_id: userId },
        });

        // Add new roles
        if (role_ids.length > 0) {
          await tx.user_roles.createMany({
            data: role_ids.map((role_id) => ({
              user_id: userId,
              role_id,
              // assigned_by: req.userId, // TODO: Set when available
            })),
          });
        }
      }

      return user;
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/users/:userId
 * Delete a user (soft delete by setting is_active=false)
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists and belongs to tenant
    const existing = await prisma.users.findFirst({
      where: {
        id: userId,
        tenant_id: req.tenantId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent deleting self
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    // Soft delete by setting is_active = false
    await prisma.users.update({
      where: { id: userId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message,
    });
  }
};
