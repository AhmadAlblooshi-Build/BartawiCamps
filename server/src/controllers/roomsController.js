import prisma from '../lib/prisma.js';

/**
 * GET /api/rooms/:roomId
 * Single room with current occupancy and latest monthly record
 */
export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.rooms.findFirst({
      where: {
        id: roomId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        blocks: {
          select: {
            code: true,
            floor_label: true,
            floor_number: true,
          },
        },
        buildings: {
          select: {
            code: true,
            name: true,
          },
        },
        camps: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        room_occupancy: {
          where: { is_current: true },
          include: {
            individuals: {
              select: {
                id: true,
                owner_name: true,
                full_name: true,
                mobile_number: true,
                nationality: true,
                company_name: true,
                profession: true,
              },
            },
            companies: {
              select: {
                id: true,
                name: true,
                contact_person: true,
                contact_phone: true,
                contact_email: true,
                industry: true,
              },
            },
            contracts: {
              select: {
                id: true,
                contract_type: true,
                start_date: true,
                end_date: true,
                status: true,
                ejari_number: true,
              },
            },
          },
          take: 1,
        },
        monthly_records: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
          include: {
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
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    // Transform data
    const currentOccupancy = room.room_occupancy[0] || null;
    const latestMonthlyRecord = room.monthly_records[0] || null;

    const response = {
      id: room.id,
      room_number: room.room_number,
      sr_number: room.sr_number,
      old_room_number: room.old_room_number,
      status: room.status,
      room_type: room.room_type,
      max_capacity: room.max_capacity,
      bed_count: room.bed_count,
      standard_rent: room.standard_rent,
      notes: room.notes,
      block: room.blocks,
      building: room.buildings,
      camp: room.camps,
      floorPlan: {
        x: room.fp_x,
        y: room.fp_y,
        width: room.fp_width,
        height: room.fp_height,
        wing: room.fp_wing,
        row: room.fp_row,
        col: room.fp_col,
      },
      currentOccupancy: currentOccupancy
        ? {
            id: currentOccupancy.id,
            peopleCount: currentOccupancy.people_count,
            monthlyRent: currentOccupancy.monthly_rent,
            checkInDate: currentOccupancy.check_in_date,
            checkOutDate: currentOccupancy.check_out_date,
            offDays: currentOccupancy.off_days,
            status: currentOccupancy.status,
            occupant: currentOccupancy.individuals || currentOccupancy.companies || null,
            occupantType: currentOccupancy.individuals ? 'individual' : 'company',
            contract: currentOccupancy.contracts || null,
          }
        : null,
      latestMonthlyRecord: latestMonthlyRecord
        ? {
            id: latestMonthlyRecord.id,
            month: latestMonthlyRecord.month,
            year: latestMonthlyRecord.year,
            rent: latestMonthlyRecord.rent,
            paid: latestMonthlyRecord.paid,
            balance: latestMonthlyRecord.balance,
            peopleCount: latestMonthlyRecord.people_count,
            offDays: latestMonthlyRecord.off_days,
            remarks: latestMonthlyRecord.remarks,
            isLocked: latestMonthlyRecord.is_locked,
            payments: latestMonthlyRecord.payments,
          }
        : null,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room details',
      message: error.message,
    });
  }
};
