import prisma from '../lib/prisma.js';

/**
 * GET /api/camps
 * List all camps for the tenant
 */
export const getAllCamps = async (req, res) => {
  try {
    const camps = await prisma.camps.findMany({
      where: {
        tenant_id: req.tenantId,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        country: true,
        total_rooms: true,
        leasable_rooms: true,
        map_configured: true,
        is_active: true,
        created_at: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    res.json({
      success: true,
      data: camps,
      count: camps.length,
    });
  } catch (error) {
    console.error('Error fetching camps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camps',
      message: error.message,
    });
  }
};

/**
 * GET /api/camps/:campId/dashboard
 * Occupancy stats + financial summary for current month
 */
export const getCampDashboard = async (req, res) => {
  try {
    const { campId } = req.params;

    // Get month and year from query params or use current
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    // Get camp details
    const camp = await prisma.camps.findFirst({
      where: {
        id: campId,
        tenant_id: req.tenantId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        total_rooms: true,
        leasable_rooms: true,
        map_configured: true,
      },
    });

    if (!camp) {
      return res.status(404).json({
        success: false,
        error: 'Camp not found',
      });
    }

    // Get room status counts
    const roomStatusCounts = await prisma.rooms.groupBy({
      by: ['status'],
      where: {
        camp_id: campId,
        is_active: true,
      },
      _count: {
        id: true,
      },
    });

    // Transform room status counts to object
    const statusBreakdown = {};
    roomStatusCounts.forEach((item) => {
      statusBreakdown[item.status] = item._count.id;
    });

    // Get monthly records for the specified month/year
    const monthlyRecords = await prisma.monthly_records.findMany({
      where: {
        camp_id: campId,
        month: month,
        year: year,
      },
      select: {
        id: true,
        room_id: true,
        rent: true,
        paid: true,
        balance: true,
        contract_type: true,
        owner_name: true,
        company_name: true,
        remarks: true,
      },
    });

    // Calculate financial summary
    const financialSummary = monthlyRecords.reduce(
      (acc, record) => {
        acc.total_rent += Number(record.rent);
        acc.total_paid += Number(record.paid);
        acc.total_balance += Number(record.balance);
        return acc;
      },
      { total_rent: 0, total_paid: 0, total_balance: 0 }
    );

    // Calculate collection rate (as decimal 0-1)
    const collection_rate = financialSummary.total_rent > 0
      ? financialSummary.total_paid / financialSummary.total_rent
      : 0;

    // Calculate occupancy rate (as decimal 0-1)
    const occupancy_rate = camp.leasable_rooms > 0
      ? (statusBreakdown.occupied || 0) / camp.leasable_rooms
      : 0;

    // Get outstanding records with room details
    const outstanding_records = await prisma.monthly_records.findMany({
      where: {
        camp_id: campId,
        month: month,
        year: year,
        balance: { gt: 0 },
      },
      include: {
        rooms: true,
      },
      orderBy: {
        balance: 'desc',
      },
    });

    // Transform outstanding_records to rename 'rooms' to 'room'
    const transformedRecords = outstanding_records.map(record => ({
      ...record,
      room: record.rooms,
      rooms: undefined,
    }));

    res.json({
      camp,
      period: { month, year },
      occupancy: {
        total_rooms: camp.total_rooms,
        occupied: statusBreakdown.occupied || 0,
        vacant: statusBreakdown.vacant || 0,
        bartawi_use: statusBreakdown.bartawi_use || 0,
        occupancy_rate,
        leasable_rooms: camp.leasable_rooms,
      },
      financials: {
        total_rent: financialSummary.total_rent,
        total_paid: financialSummary.total_paid,
        total_balance: financialSummary.total_balance,
        collection_rate,
      },
      outstanding_records: transformedRecords,
    });
  } catch (error) {
    console.error('Error fetching camp dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camp dashboard',
      message: error.message,
    });
  }
};

/**
 * GET /api/camps/:campId/buildings
 * All buildings with their blocks and room counts
 */
export const getCampBuildings = async (req, res) => {
  try {
    const { campId } = req.params;

    const buildings = await prisma.buildings.findMany({
      where: {
        camp_id: campId,
        is_active: true,
      },
      include: {
        blocks: {
          where: { is_active: true },
          select: {
            id: true,
            code: true,
            floor_label: true,
            floor_number: true,
            room_count: true,
          },
          orderBy: {
            floor_number: 'asc',
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    // Calculate total rooms per building
    const buildingsWithCounts = buildings.map((building) => ({
      ...building,
      totalRooms: building.blocks.reduce((sum, block) => sum + block.room_count, 0),
    }));

    res.json({
      success: true,
      data: buildingsWithCounts,
      count: buildingsWithCounts.length,
    });
  } catch (error) {
    console.error('Error fetching camp buildings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camp buildings',
      message: error.message,
    });
  }
};

/**
 * GET /api/camps/:campId/rooms
 * All rooms for a camp with current status
 */
export const getCampRooms = async (req, res) => {
  try {
    const { campId } = req.params;
    const { status, building_id, block_id, room_type } = req.query;

    // Build where clause with optional filters
    const where = {
      camp_id: campId,
      is_active: true,
    };

    if (status) where.status = status;
    if (building_id) where.building_id = building_id;
    if (block_id) where.block_id = block_id;
    if (room_type) where.room_type = room_type;

    const rooms = await prisma.rooms.findMany({
      where,
      include: {
        blocks: {
          select: {
            code: true,
            floor_label: true,
          },
        },
        buildings: {
          select: {
            code: true,
            name: true,
          },
        },
        room_occupancy: {
          where: { is_current: true },
          select: {
            id: true,
            people_count: true,
            monthly_rent: true,
            check_in_date: true,
            status: true,
            individuals: {
              select: {
                owner_name: true,
              },
            },
            companies: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        room_number: 'asc',
      },
    });

    // Transform data to include occupant info at room level
    const roomsWithOccupants = rooms.map((room) => {
      const currentOccupancy = room.room_occupancy[0] || null;

      return {
        id: room.id,
        room_number: room.room_number,
        status: room.status,
        room_type: room.room_type,
        max_capacity: room.max_capacity,
        standard_rent: room.standard_rent,
        block: room.blocks,
        building: room.buildings,
        currentOccupancy: currentOccupancy
          ? {
              occupancyId: currentOccupancy.id,
              peopleCount: currentOccupancy.people_count,
              monthlyRent: currentOccupancy.monthly_rent,
              checkInDate: currentOccupancy.check_in_date,
              occupantName:
                currentOccupancy.individuals?.owner_name ||
                currentOccupancy.companies?.name ||
                null,
              occupantType: currentOccupancy.individuals ? 'individual' : 'company',
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: roomsWithOccupants,
      count: roomsWithOccupants.length,
      filters: { status, building_id, block_id, room_type },
    });
  } catch (error) {
    console.error('Error fetching camp rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camp rooms',
      message: error.message,
    });
  }
};
