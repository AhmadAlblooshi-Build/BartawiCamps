import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';
import { createPropertyTypeSchema, updatePropertyTypeSchema } from '../schemas/propertyTypes.js';
import logger from '../lib/logger.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/property-types
 * List all active property types for the tenant
 */
router.get('/', requirePermission('property_types.read'), async (req, res, next) => {
  try {
    const types = await prisma.property_types.findMany({
      where: {
        tenant_id: req.tenantId,
        is_active: true,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon_name: true,
        display_color: true,
        is_residential: true,
        is_leasable: true,
        sort_order: true,
        created_at: true,
      },
    });

    res.json({ property_types: types });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/property-types/:id
 * Get single property type with room count
 */
router.get('/:id', requirePermission('property_types.read'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await prisma.property_types.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
      include: {
        rooms: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!type) {
      throw new ApiError('NOT_FOUND', 'Property type not found', 404);
    }

    const room_count = type.rooms.length;
    delete type.rooms;

    res.json({ property_type: { ...type, room_count } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/property-types
 * Create new property type
 */
router.post('/', requirePermission('property_types.write'), validate(createPropertyTypeSchema), async (req, res, next) => {
  try {
    const { name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order } = req.body;

    // Check slug uniqueness
    const existing = await prisma.property_types.findFirst({
      where: {
        tenant_id: req.tenantId,
        slug,
      },
    });

    if (existing) {
      throw new ApiError('DUPLICATE', 'Property type with this slug already exists', 409);
    }

    const propertyType = await prisma.property_types.create({
      data: {
        tenant_id: req.tenantId,
        name,
        slug,
        description,
        icon_name,
        display_color,
        is_residential,
        is_leasable,
        sort_order,
      },
    });

    logger.info({ user_id: req.user.id, property_type_id: propertyType.id }, 'Property type created');

    res.status(201).json({ property_type: propertyType });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/property-types/:id
 * Update property type
 */
router.patch('/:id', requirePermission('property_types.write'), validate(updatePropertyTypeSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const existing = await prisma.property_types.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
    });

    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Property type not found', 404);
    }

    const updated = await prisma.property_types.update({
      where: { id },
      data: updates,
    });

    logger.info({ user_id: req.user.id, property_type_id: id }, 'Property type updated');

    res.json({ property_type: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/property-types/:id
 * Soft delete if rooms reference it, hard delete otherwise
 */
router.delete('/:id', requirePermission('property_types.delete'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.property_types.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
      include: {
        rooms: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Property type not found', 404);
    }

    if (existing.rooms.length > 0) {
      // Soft delete (rooms still reference this type)
      await prisma.property_types.update({
        where: { id },
        data: { is_active: false },
      });

      logger.info({ user_id: req.user.id, property_type_id: id, room_count: existing.rooms.length }, 'Property type soft deleted');

      res.json({ message: 'Property type deactivated (rooms still reference it)', deleted: false });
    } else {
      // Hard delete (no rooms reference it)
      await prisma.property_types.delete({
        where: { id },
      });

      logger.info({ user_id: req.user.id, property_type_id: id }, 'Property type hard deleted');

      res.json({ message: 'Property type permanently deleted', deleted: true });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
