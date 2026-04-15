import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * Generate unique complaint reference number
 * Format: CMP-YYYYMMDD-XXXX
 */
const generateComplaintRef = async () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

  // Get count of complaints created today
  const todayStart = new Date(date.setHours(0, 0, 0, 0));
  const todayEnd = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.complaints.count({
    where: {
      created_at: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `CMP-${dateStr}-${sequence}`;
};

/**
 * GET /api/complaints
 * List complaints with filters
 */
export const getComplaints = async (req, res) => {
  try {
    const {
      camp_id,
      status,
      priority,
      category_id,
      building_id,
      room_id,
      reported_via,
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
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category_id) where.category_id = category_id;
    if (building_id) where.building_id = building_id;
    if (room_id) where.room_id = room_id;
    if (reported_via) where.reported_via = reported_via;

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.complaints.count({ where });

    // Fetch complaints
    const complaints = await prisma.complaints.findMany({
      where,
      include: {
        camps: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        rooms: {
          select: {
            id: true,
            room_number: true,
            buildings: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        buildings: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        complaint_categories: {
          select: {
            id: true,
            name: true,
          },
        },
        users_complaints_reported_by_userTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        users_complaints_assigned_toTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        users_complaints_resolved_byTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take,
    });

    // Transform data
    const transformedComplaints = complaints.map((complaint) => ({
      id: complaint.id,
      complaintRef: complaint.complaint_ref,
      title: complaint.title,
      description: complaint.description,
      status: complaint.status,
      priority: complaint.priority,
      reportedByName: complaint.reported_by_name,
      reportedByRoom: complaint.reported_by_room,
      reportedVia: complaint.reported_via,
      resolvedAt: complaint.resolved_at,
      resolutionNotes: complaint.resolution_notes,
      imageUrls: complaint.image_urls,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      camp: complaint.camps,
      room: complaint.rooms,
      building: complaint.buildings,
      category: complaint.complaint_categories,
      reportedByUser: complaint.users_complaints_reported_by_userTousers,
      assignedTo: complaint.users_complaints_assigned_toTousers,
      resolvedBy: complaint.users_complaints_resolved_byTousers,
    }));

    res.json({
      success: true,
      data: transformedComplaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
      filters: {
        camp_id,
        status,
        priority,
        category_id,
        building_id,
        room_id,
        reported_via,
      },
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      message: error.message,
    });
  }
};

/**
 * POST /api/complaints
 * Create a new complaint
 */
export const createComplaint = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      camp_id,
      room_id,
      building_id,
      category_id,
      title,
      description,
      priority = 'medium',
      status = 'open',
      reported_by_name,
      reported_by_room,
      reported_via = 'staff',
      image_urls = [],
    } = req.body;

    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: {
        id: camp_id,
        tenant_id: req.tenantId,
      },
    });

    if (!camp) {
      return res.status(404).json({
        success: false,
        error: 'Camp not found',
      });
    }

    // Generate complaint reference
    const complaint_ref = await generateComplaintRef();

    // Create complaint
    const complaint = await prisma.complaints.create({
      data: {
        complaint_ref,
        camp_id,
        room_id: room_id || null,
        building_id: building_id || null,
        category_id: category_id || null,
        title,
        description,
        priority,
        status,
        reported_by_name,
        reported_by_room,
        reported_via,
        image_urls: JSON.stringify(image_urls),
        // reported_by_user: req.userId, // TODO: Set when auth is implemented
      },
      include: {
        camps: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        rooms: {
          select: {
            id: true,
            room_number: true,
          },
        },
        buildings: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        complaint_categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint',
      message: error.message,
    });
  }
};

/**
 * GET /api/complaints/:complaintId
 * Get single complaint details
 */
export const getComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await prisma.complaints.findFirst({
      where: {
        id: complaintId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        camps: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        rooms: {
          select: {
            id: true,
            room_number: true,
            buildings: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        buildings: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        complaint_categories: {
          select: {
            id: true,
            name: true,
          },
        },
        users_complaints_reported_by_userTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        users_complaints_assigned_toTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        users_complaints_resolved_byTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        complaint_updates: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
    }

    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint',
      message: error.message,
    });
  }
};

/**
 * PUT /api/complaints/:complaintId
 * Update complaint details
 */
export const updateComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const {
      title,
      description,
      priority,
      status,
      category_id,
      resolution_notes,
    } = req.body;

    // Verify complaint exists and belongs to tenant
    const existing = await prisma.complaints.findFirst({
      where: {
        id: complaintId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
    }

    // Track status change for audit
    const oldStatus = existing.status;
    const newStatus = status || existing.status;

    // Update complaint in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update complaint
      const updated = await tx.complaints.update({
        where: { id: complaintId },
        data: {
          title,
          description,
          priority,
          status: newStatus,
          category_id,
          resolution_notes,
          updated_at: new Date(),
        },
        include: {
          camps: true,
          rooms: true,
          complaint_categories: true,
        },
      });

      // Create status update log if status changed
      if (oldStatus !== newStatus) {
        await tx.complaint_updates.create({
          data: {
            complaint_id: complaintId,
            old_status: oldStatus,
            new_status: newStatus,
            note: `Status changed from ${oldStatus} to ${newStatus}`,
            // user_id: req.userId, // TODO: Set when auth implemented
          },
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint',
      message: error.message,
    });
  }
};

/**
 * POST /api/complaints/:complaintId/assign
 * Assign complaint to a user
 */
export const assignComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        error: 'assigned_to user ID is required',
      });
    }

    // Verify complaint exists and belongs to tenant
    const existing = await prisma.complaints.findFirst({
      where: {
        id: complaintId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
    }

    // Verify user exists and belongs to tenant
    const user = await prisma.users.findFirst({
      where: {
        id: assigned_to,
        tenant_id: req.tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update complaint and log
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaints.update({
        where: { id: complaintId },
        data: {
          assigned_to,
          status: existing.status === 'open' ? 'in_progress' : existing.status,
          updated_at: new Date(),
        },
        include: {
          users_complaints_assigned_toTousers: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      // Log assignment
      await tx.complaint_updates.create({
        data: {
          complaint_id: complaintId,
          old_status: existing.status,
          new_status: updated.status,
          note: `Assigned to ${user.full_name}`,
          // user_id: req.userId, // TODO: Set when auth implemented
        },
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error assigning complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign complaint',
      message: error.message,
    });
  }
};

/**
 * POST /api/complaints/:complaintId/resolve
 * Mark complaint as resolved
 */
export const resolveComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes) {
      return res.status(400).json({
        success: false,
        error: 'resolution_notes are required',
      });
    }

    // Verify complaint exists and belongs to tenant
    const existing = await prisma.complaints.findFirst({
      where: {
        id: complaintId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found',
      });
    }

    // Update complaint and log
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaints.update({
        where: { id: complaintId },
        data: {
          status: 'resolved',
          resolution_notes,
          resolved_at: new Date(),
          // resolved_by: req.userId, // TODO: Set when auth implemented
          updated_at: new Date(),
        },
      });

      // Log resolution
      await tx.complaint_updates.create({
        data: {
          complaint_id: complaintId,
          old_status: existing.status,
          new_status: 'resolved',
          note: resolution_notes,
          // user_id: req.userId, // TODO: Set when auth implemented
        },
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Complaint resolved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve complaint',
      message: error.message,
    });
  }
};
