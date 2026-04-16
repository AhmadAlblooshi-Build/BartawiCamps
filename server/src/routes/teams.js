import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../lib/validate.js';
import { ApiError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';
import { createTeamSchema, addTeamMemberSchema } from '../schemas/teams.js';
import logger from '../lib/logger.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/teams
 * List all active teams with member counts
 */
router.get('/', requirePermission('teams.read'), async (req, res, next) => {
  try {
    const teams = await prisma.teams.findMany({
      where: {
        tenant_id: req.tenantId,
        is_active: true,
      },
      include: {
        team_members: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/teams
 * Create new team
 */
router.post('/', requirePermission('teams.write'), validate(createTeamSchema), async (req, res, next) => {
  try {
    const { name, slug, description, icon_name } = req.body;

    // Check slug uniqueness
    const existing = await prisma.teams.findFirst({
      where: {
        tenant_id: req.tenantId,
        slug,
      },
    });

    if (existing) {
      throw new ApiError('DUPLICATE', 'Team with this slug already exists', 409);
    }

    const team = await prisma.teams.create({
      data: {
        tenant_id: req.tenantId,
        name,
        slug,
        description,
        icon_name,
      },
    });

    logger.info({ user_id: req.user.id, team_id: team.id }, 'Team created');

    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/teams/:id/members
 * Add member to team
 */
router.post('/:id/members', requirePermission('teams.write'), validate(addTeamMemberSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, is_lead } = req.body;

    // Verify team exists and belongs to tenant
    const team = await prisma.teams.findFirst({
      where: {
        id,
        tenant_id: req.tenantId,
      },
    });

    if (!team) {
      throw new ApiError('NOT_FOUND', 'Team not found', 404);
    }

    // Verify user exists
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
        tenant_id: req.tenantId,
      },
    });

    if (!user) {
      throw new ApiError('NOT_FOUND', 'User not found', 404);
    }

    // Add member (upsert to handle duplicates)
    const member = await prisma.team_members.upsert({
      where: {
        team_id_user_id: {
          team_id: id,
          user_id,
        },
      },
      create: {
        team_id: id,
        user_id,
        is_lead,
      },
      update: {
        is_lead,
      },
    });

    logger.info({ user_id: req.user.id, team_id: id, member_user_id: user_id, is_lead }, 'Team member added');

    res.status(201).json({ member });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/teams/:teamId/members/:userId
 * Remove member from team
 */
router.delete('/:teamId/members/:userId', requirePermission('teams.write'), async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;

    // Verify team exists and belongs to tenant
    const team = await prisma.teams.findFirst({
      where: {
        id: teamId,
        tenant_id: req.tenantId,
      },
    });

    if (!team) {
      throw new ApiError('NOT_FOUND', 'Team not found', 404);
    }

    // Delete member
    await prisma.team_members.delete({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
    });

    logger.info({ user_id: req.user.id, team_id: teamId, removed_user_id: userId }, 'Team member removed');

    res.json({ message: 'Team member removed' });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError('NOT_FOUND', 'Team member not found', 404));
    }
    next(error);
  }
});

export default router;
