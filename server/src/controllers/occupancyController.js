import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * POST /api/occupancy/check-in
 * Check in a tenant to a room
 */
export const checkIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      room_id,
      individual_id,
      company_id,
      contract_id,
      people_count,
      monthly_rent,
      check_in_date,
    } = req.body;

    // Verify room belongs to tenant
    const room = await prisma.rooms.findFirst({
      where: {
        id: room_id,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        camps: true,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    // Check if room is available
    if (room.status === 'occupied') {
      return res.status(400).json({
        success: false,
        error: 'Room is already occupied',
      });
    }

    // Check-in transaction: create occupancy + update room status
    const result = await prisma.$transaction(async (tx) => {
      // End any existing current occupancy for this room
      await tx.room_occupancy.updateMany({
        where: {
          room_id,
          is_current: true,
        },
        data: {
          is_current: false,
          check_out_date: new Date(),
        },
      });

      // Create new occupancy record
      const occupancy = await tx.room_occupancy.create({
        data: {
          room_id,
          camp_id: room.camp_id,
          individual_id,
          company_id,
          contract_id,
          people_count,
          monthly_rent,
          check_in_date: check_in_date ? new Date(check_in_date) : new Date(),
          status: 'active',
          is_current: true,
          // created_by: req.userId, // TODO: Set when auth implemented
        },
        include: {
          individuals: true,
          companies: true,
          contracts: true,
        },
      });

      // Update room status to occupied
      const updatedRoom = await tx.rooms.update({
        where: { id: room_id },
        data: {
          status: 'occupied',
          updated_at: new Date(),
        },
      });

      return { occupancy, room: updatedRoom };
    });

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: result,
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({
      success: false,
      error: 'Check-in failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/occupancy/check-out
 * Check out a tenant from a room
 */
export const checkOut = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { occupancy_id, check_out_date, reason_for_leaving } = req.body;

    // Verify occupancy exists and belongs to tenant
    const occupancy = await prisma.room_occupancy.findFirst({
      where: {
        id: occupancy_id,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        rooms: true,
      },
    });

    if (!occupancy) {
      return res.status(404).json({
        success: false,
        error: 'Occupancy record not found',
      });
    }

    if (!occupancy.is_current) {
      return res.status(400).json({
        success: false,
        error: 'Occupancy is already checked out',
      });
    }

    // Check-out transaction: update occupancy + update room status
    const result = await prisma.$transaction(async (tx) => {
      // Update occupancy record
      const updated = await tx.room_occupancy.update({
        where: { id: occupancy_id },
        data: {
          check_out_date: check_out_date ? new Date(check_out_date) : new Date(),
          reason_for_leaving,
          is_current: false,
          status: 'checked_out',
          updated_at: new Date(),
        },
        include: {
          individuals: true,
          companies: true,
        },
      });

      // Update room status to vacant
      const updatedRoom = await tx.rooms.update({
        where: { id: occupancy.room_id },
        data: {
          status: 'vacant',
          updated_at: new Date(),
        },
      });

      return { occupancy: updated, room: updatedRoom };
    });

    res.json({
      success: true,
      message: 'Check-out successful',
      data: result,
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({
      success: false,
      error: 'Check-out failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/occupancy/history
 * Get occupancy history with filters
 */
export const getOccupancyHistory = async (req, res) => {
  try {
    const {
      camp_id,
      room_id,
      individual_id,
      company_id,
      is_current,
      page = 1,
      limit = 50,
    } = req.query;

    // Build where clause
    const where = {
      camps: {
        tenant_id: req.tenantId,
      },
    };

    if (camp_id) where.camp_id = camp_id;
    if (room_id) where.room_id = room_id;
    if (individual_id) where.individual_id = individual_id;
    if (company_id) where.company_id = company_id;
    if (is_current !== undefined) where.is_current = is_current === 'true';

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.room_occupancy.count({ where });

    // Fetch occupancy records
    const records = await prisma.room_occupancy.findMany({
      where,
      include: {
        rooms: {
          select: {
            room_number: true,
            buildings: {
              select: {
                code: true,
              },
            },
          },
        },
        camps: {
          select: {
            name: true,
            code: true,
          },
        },
        individuals: {
          select: {
            owner_name: true,
            full_name: true,
            mobile_number: true,
          },
        },
        companies: {
          select: {
            name: true,
            contact_person: true,
            contact_phone: true,
          },
        },
        contracts: {
          select: {
            contract_type: true,
            start_date: true,
            end_date: true,
          },
        },
      },
      orderBy: {
        check_in_date: 'desc',
      },
      skip,
      take,
    });

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Error fetching occupancy history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch occupancy history',
      message: error.message,
    });
  }
};
