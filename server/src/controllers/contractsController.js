import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * GET /api/contracts
 * List all contracts with filters
 */
export const getContracts = async (req, res) => {
  try {
    const {
      camp_id,
      room_id,
      company_id,
      status,
      contract_type,
      expiring_days, // contracts expiring within N days
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
    if (company_id) where.company_id = company_id;
    if (status) where.status = status;
    if (contract_type) where.contract_type = contract_type;

    // Filter expiring contracts
    if (expiring_days) {
      const daysAhead = parseInt(expiring_days);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      where.end_date = {
        gte: new Date(),
        lte: futureDate,
      };
      where.status = 'active';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.contracts.count({ where });

    // Fetch contracts
    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        camps: {
          select: {
            name: true,
            code: true,
          },
        },
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
        companies: {
          select: {
            name: true,
            contact_person: true,
            contact_phone: true,
          },
        },
        users: {
          select: {
            full_name: true,
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
      data: contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contracts',
      message: error.message,
    });
  }
};

/**
 * GET /api/contracts/:contractId
 * Get single contract details
 */
export const getContract = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.contracts.findFirst({
      where: {
        id: contractId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        camps: true,
        rooms: {
          include: {
            buildings: true,
            blocks: true,
          },
        },
        companies: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        contract_alerts: {
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract',
      message: error.message,
    });
  }
};

/**
 * POST /api/contracts
 * Create a new contract
 */
export const createContract = async (req, res) => {
  try {
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
      company_id,
      contract_type,
      monthly_rent,
      start_date,
      end_date,
      auto_renew = false,
      renewal_notice_days = 60,
      ejari_number,
      notes,
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

    // Verify room exists
    const room = await prisma.rooms.findFirst({
      where: {
        id: room_id,
        camp_id,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    // Check for active contracts on this room
    const existingContract = await prisma.contracts.findFirst({
      where: {
        room_id,
        status: 'active',
      },
    });

    if (existingContract) {
      return res.status(400).json({
        success: false,
        error: 'Room already has an active contract',
        existingContractId: existingContract.id,
      });
    }

    // Create contract
    const contract = await prisma.contracts.create({
      data: {
        camp_id,
        room_id,
        company_id,
        contract_type,
        monthly_rent,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        auto_renew,
        renewal_notice_days,
        status: 'active',
        ejari_number,
        notes,
        // created_by: req.userId, // TODO: Set when auth implemented
      },
      include: {
        camps: true,
        rooms: true,
        companies: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      data: contract,
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contract',
      message: error.message,
    });
  }
};

/**
 * PUT /api/contracts/:contractId
 * Update a contract
 */
export const updateContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const {
      monthly_rent,
      start_date,
      end_date,
      auto_renew,
      renewal_notice_days,
      status,
      ejari_number,
      notes,
    } = req.body;

    // Verify contract exists and belongs to tenant
    const existing = await prisma.contracts.findFirst({
      where: {
        id: contractId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Update contract
    const updated = await prisma.contracts.update({
      where: { id: contractId },
      data: {
        monthly_rent,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        auto_renew,
        renewal_notice_days,
        status,
        ejari_number,
        notes,
        updated_at: new Date(),
      },
      include: {
        camps: true,
        rooms: true,
        companies: true,
      },
    });

    res.json({
      success: true,
      message: 'Contract updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contract',
      message: error.message,
    });
  }
};

/**
 * GET /api/contracts/expiring
 * Get contracts expiring soon
 */
export const getExpiringContracts = async (req, res) => {
  try {
    const { days = 60, camp_id } = req.query;

    const daysAhead = parseInt(days);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Build where clause
    const where = {
      camps: {
        tenant_id: req.tenantId,
      },
      status: 'active',
      end_date: {
        gte: new Date(),
        lte: futureDate,
      },
    };

    if (camp_id) {
      where.camp_id = camp_id;
    }

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        camps: {
          select: {
            name: true,
            code: true,
          },
        },
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
        companies: {
          select: {
            name: true,
            contact_person: true,
            contact_phone: true,
          },
        },
      },
      orderBy: {
        end_date: 'asc',
      },
    });

    // Calculate days until expiry for each contract
    const contractsWithDays = contracts.map((contract) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...contract,
        daysUntilExpiry,
        urgency:
          daysUntilExpiry <= 30
            ? 'urgent'
            : daysUntilExpiry <= 60
            ? 'high'
            : 'medium',
      };
    });

    res.json({
      success: true,
      data: contractsWithDays,
      count: contractsWithDays.length,
      filters: {
        days: daysAhead,
        camp_id,
      },
    });
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expiring contracts',
      message: error.message,
    });
  }
};
