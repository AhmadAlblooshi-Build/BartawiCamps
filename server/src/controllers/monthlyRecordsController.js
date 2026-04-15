import prisma from '../lib/prisma.js';
import { validationResult } from 'express-validator';

/**
 * GET /api/monthly-records
 * List monthly records with filters (camp, month, year, balance > 0)
 */
export const getMonthlyRecords = async (req, res) => {
  try {
    const {
      camp_id,
      month,
      year,
      has_balance, // "true" to filter balance > 0
      room_number,
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
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (has_balance === 'true') {
      where.balance = { gt: 0 };
    }

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count for pagination
    const totalCount = await prisma.monthly_records.count({ where });

    // Fetch records with room and occupant details
    const records = await prisma.monthly_records.findMany({
      where,
      include: {
        rooms: {
          select: {
            id: true,
            room_number: true,
            room_type: true,
            buildings: {
              select: {
                code: true,
                name: true,
              },
            },
            blocks: {
              select: {
                code: true,
                floor_label: true,
              },
            },
          },
        },
        camps: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        individuals: {
          select: {
            id: true,
            owner_name: true,
            full_name: true,
            mobile_number: true,
          },
        },
        companies: {
          select: {
            id: true,
            name: true,
            contact_person: true,
            contact_phone: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            payment_date: true,
            reference_number: true,
          },
          orderBy: {
            payment_date: 'desc',
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { rooms: { room_number: 'asc' } },
      ],
      skip,
      take,
    });

    // Transform data
    const transformedRecords = records.map((record) => ({
      id: record.id,
      month: record.month,
      year: record.year,
      rent: record.rent,
      paid: record.paid,
      balance: record.balance,
      peopleCount: record.people_count,
      offDays: record.off_days,
      remarks: record.remarks,
      isLocked: record.is_locked,
      contractType: record.contract_type,
      room: record.rooms,
      camp: record.camps,
      occupant: record.individuals || record.companies || null,
      occupantType: record.individuals ? 'individual' : record.companies ? 'company' : null,
      payments: record.payments,
      paymentsTotal: record.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    }));

    // Calculate summary statistics
    const summary = records.reduce(
      (acc, record) => {
        acc.totalRent += Number(record.rent);
        acc.totalPaid += Number(record.paid);
        acc.totalBalance += Number(record.balance);
        return acc;
      },
      { totalRent: 0, totalPaid: 0, totalBalance: 0 }
    );

    res.json({
      success: true,
      data: transformedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
      summary,
      filters: { camp_id, month, year, has_balance, room_number },
    });
  } catch (error) {
    console.error('Error fetching monthly records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly records',
      message: error.message,
    });
  }
};

/**
 * GET /api/monthly-records/:recordId
 * Get single monthly record with full details
 */
export const getMonthlyRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.monthly_records.findFirst({
      where: {
        id: recordId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        rooms: {
          include: {
            buildings: true,
            blocks: true,
          },
        },
        camps: true,
        individuals: true,
        companies: true,
        payments: {
          orderBy: {
            payment_date: 'desc',
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Monthly record not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: record.id,
        month: record.month,
        year: record.year,
        rent: record.rent,
        paid: record.paid,
        balance: record.balance,
        peopleCount: record.people_count,
        offDays: record.off_days,
        remarks: record.remarks,
        isLocked: record.is_locked,
        contractType: record.contract_type,
        room: record.rooms,
        camp: record.camps,
        occupant: record.individuals || record.companies || null,
        occupantType: record.individuals ? 'individual' : record.companies ? 'company' : null,
        payments: record.payments,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching monthly record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly record',
      message: error.message,
    });
  }
};

/**
 * POST /api/monthly-records
 * Create a new monthly record
 */
export const createMonthlyRecord = async (req, res) => {
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
      month,
      year,
      individual_id,
      company_id,
      rent,
      paid = 0,
      people_count = 0,
      off_days = 0,
      remarks,
      contract_type,
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

    // Check if record already exists for this room/month/year
    const existing = await prisma.monthly_records.findUnique({
      where: {
        room_id_month_year: {
          room_id,
          month,
          year,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Monthly record already exists for this room and period',
      });
    }

    // Get owner name from individual or company
    let owner_name = null;
    let company_name = null;

    if (individual_id) {
      const individual = await prisma.individuals.findUnique({
        where: { id: individual_id },
      });
      owner_name = individual?.owner_name;
    }

    if (company_id) {
      const company = await prisma.companies.findUnique({
        where: { id: company_id },
      });
      company_name = company?.name;
    }

    // Create monthly record
    const record = await prisma.monthly_records.create({
      data: {
        room_id,
        camp_id: room.camp_id,
        month,
        year,
        individual_id,
        company_id,
        owner_name,
        company_name,
        rent,
        paid,
        people_count,
        off_days,
        remarks,
        contract_type,
      },
      include: {
        rooms: true,
        camps: true,
        individuals: true,
        companies: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Monthly record created successfully',
      data: record,
    });
  } catch (error) {
    console.error('Error creating monthly record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create monthly record',
      message: error.message,
    });
  }
};

/**
 * PUT /api/monthly-records/:recordId
 * Update a monthly record
 */
export const updateMonthlyRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { rent, paid, people_count, off_days, remarks } = req.body;

    // Verify record exists and belongs to tenant
    const existing = await prisma.monthly_records.findFirst({
      where: {
        id: recordId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Monthly record not found',
      });
    }

    // Check if locked
    if (existing.is_locked) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update locked monthly record',
      });
    }

    // Update record
    const updated = await prisma.monthly_records.update({
      where: { id: recordId },
      data: {
        rent,
        paid,
        people_count,
        off_days,
        remarks,
        updated_at: new Date(),
      },
      include: {
        rooms: true,
        camps: true,
        individuals: true,
        companies: true,
        payments: true,
      },
    });

    res.json({
      success: true,
      message: 'Monthly record updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating monthly record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monthly record',
      message: error.message,
    });
  }
};

/**
 * POST /api/monthly-records/lock
 * Lock monthly records for a specific period
 */
export const lockMonthlyRecords = async (req, res) => {
  try {
    const { camp_id, month, year } = req.body;

    if (!camp_id || !month || !year) {
      return res.status(400).json({
        success: false,
        error: 'camp_id, month, and year are required',
      });
    }

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

    // Lock all records for this camp/period
    const result = await prisma.monthly_records.updateMany({
      where: {
        camp_id,
        month,
        year,
        is_locked: false,
      },
      data: {
        is_locked: true,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Locked ${result.count} monthly records for ${camp.name} - ${month}/${year}`,
      data: {
        camp_id,
        month,
        year,
        recordsLocked: result.count,
      },
    });
  } catch (error) {
    console.error('Error locking monthly records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock monthly records',
      message: error.message,
    });
  }
};
