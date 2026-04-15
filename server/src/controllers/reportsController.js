import prisma from '../lib/prisma.js';

/**
 * GET /api/reports/financial-summary
 * Financial summary report with income and expenses
 */
export const getFinancialSummary = async (req, res) => {
  try {
    const { camp_id, month, year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Year is required',
      });
    }

    // Build where clause for monthly records
    const monthlyWhere = {
      camps: {
        tenant_id: req.tenantId,
      },
      year: parseInt(year),
    };

    if (camp_id) monthlyWhere.camp_id = camp_id;
    if (month) monthlyWhere.month = parseInt(month);

    // Build where clause for expenses
    const expensesWhere = {
      camps: {
        tenant_id: req.tenantId,
      },
      year: parseInt(year),
    };

    if (camp_id) expensesWhere.camp_id = camp_id;
    if (month) expensesWhere.month = parseInt(month);

    // Get income data
    const monthlyRecords = await prisma.monthly_records.findMany({
      where: monthlyWhere,
      select: {
        month: true,
        rent: true,
        paid: true,
        balance: true,
      },
    });

    // Get expense data
    const expenses = await prisma.expenses.findMany({
      where: expensesWhere,
      select: {
        month: true,
        amount: true,
      },
    });

    // Aggregate by month
    const monthlyData = {};

    // Process income
    monthlyRecords.forEach((record) => {
      const m = record.month;
      if (!monthlyData[m]) {
        monthlyData[m] = {
          month: m,
          totalRent: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalExpenses: 0,
          netIncome: 0,
        };
      }
      monthlyData[m].totalRent += Number(record.rent);
      monthlyData[m].totalPaid += Number(record.paid);
      monthlyData[m].totalBalance += Number(record.balance);
    });

    // Process expenses
    expenses.forEach((expense) => {
      const m = expense.month;
      if (!monthlyData[m]) {
        monthlyData[m] = {
          month: m,
          totalRent: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalExpenses: 0,
          netIncome: 0,
        };
      }
      monthlyData[m].totalExpenses += Number(expense.amount);
    });

    // Calculate net income
    Object.values(monthlyData).forEach((data) => {
      data.netIncome = data.totalPaid - data.totalExpenses;
    });

    // Convert to array and sort by month
    const summary = Object.values(monthlyData).sort((a, b) => a.month - b.month);

    // Calculate totals
    const totals = summary.reduce(
      (acc, data) => {
        acc.totalRent += data.totalRent;
        acc.totalPaid += data.totalPaid;
        acc.totalBalance += data.totalBalance;
        acc.totalExpenses += data.totalExpenses;
        acc.netIncome += data.netIncome;
        return acc;
      },
      {
        totalRent: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalExpenses: 0,
        netIncome: 0,
      }
    );

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: month ? parseInt(month) : null,
        camp_id: camp_id || null,
        monthlyBreakdown: summary,
        totals,
      },
    });
  } catch (error) {
    console.error('Error generating financial summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate financial summary',
      message: error.message,
    });
  }
};

/**
 * GET /api/reports/occupancy-report
 * Occupancy statistics report
 */
export const getOccupancyReport = async (req, res) => {
  try {
    const { camp_id } = req.query;

    // Build where clause
    const where = {
      camps: {
        tenant_id: req.tenantId,
      },
    };

    if (camp_id) {
      where.camp_id = camp_id;
    }

    // Get all camps
    const camps = await prisma.camps.findMany({
      where: {
        tenant_id: req.tenantId,
        ...(camp_id ? { id: camp_id } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        total_rooms: true,
        leasable_rooms: true,
      },
    });

    // Get room statistics for each camp
    const campReports = await Promise.all(
      camps.map(async (camp) => {
        // Get room counts by status
        const roomStats = await prisma.rooms.groupBy({
          by: ['status'],
          where: {
            camp_id: camp.id,
            is_active: true,
          },
          _count: {
            id: true,
          },
        });

        const statusBreakdown = {};
        roomStats.forEach((stat) => {
          statusBreakdown[stat.status] = stat._count.id;
        });

        const occupiedRooms = statusBreakdown.occupied || 0;
        const occupancyRate = camp.leasable_rooms > 0
          ? ((occupiedRooms / camp.leasable_rooms) * 100).toFixed(2)
          : 0;

        // Get current month revenue potential
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const monthlyRecords = await prisma.monthly_records.findMany({
          where: {
            camp_id: camp.id,
            month: currentMonth,
            year: currentYear,
          },
          select: {
            rent: true,
            paid: true,
            balance: true,
            people_count: true,
          },
        });

        const financial = monthlyRecords.reduce(
          (acc, record) => {
            acc.totalRent += Number(record.rent);
            acc.totalPaid += Number(record.paid);
            acc.totalBalance += Number(record.balance);
            acc.totalPeople += record.people_count || 0;
            return acc;
          },
          { totalRent: 0, totalPaid: 0, totalBalance: 0, totalPeople: 0 }
        );

        return {
          camp,
          occupancy: {
            totalRooms: camp.total_rooms,
            leasableRooms: camp.leasable_rooms,
            occupiedRooms,
            vacantRooms: statusBreakdown.vacant || 0,
            maintenanceRooms: statusBreakdown.maintenance || 0,
            barताwiUseRooms: statusBreakdown.bartawi_use || 0,
            occupancyRate: parseFloat(occupancyRate),
            totalPeople: financial.totalPeople,
          },
          currentMonthFinancial: {
            month: currentMonth,
            year: currentYear,
            ...financial,
          },
        };
      })
    );

    res.json({
      success: true,
      data: campReports,
    });
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate occupancy report',
      message: error.message,
    });
  }
};

/**
 * GET /api/reports/collections
 * Payment collections report
 */
export const getCollectionsReport = async (req, res) => {
  try {
    const { camp_id, month, year, date_from, date_to } = req.query;

    // Build where clause
    const where = {
      camps: {
        tenant_id: req.tenantId,
      },
    };

    if (camp_id) where.camp_id = camp_id;

    // Date filtering
    if (date_from || date_to) {
      where.payment_date = {};
      if (date_from) where.payment_date.gte = new Date(date_from);
      if (date_to) where.payment_date.lte = new Date(date_to);
    } else if (month && year) {
      // Filter by month if no date range provided
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.payment_date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get payments
    const payments = await prisma.payments.findMany({
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
          },
        },
        monthly_records: {
          select: {
            month: true,
            year: true,
          },
        },
      },
      orderBy: {
        payment_date: 'desc',
      },
    });

    // Aggregate by payment method
    const byMethod = {};
    const byCamp = {};
    let totalCollected = 0;

    payments.forEach((payment) => {
      const amount = Number(payment.amount);
      totalCollected += amount;

      // By method
      byMethod[payment.payment_method] = (byMethod[payment.payment_method] || 0) + amount;

      // By camp
      const campName = payment.camps.name;
      byCamp[campName] = (byCamp[campName] || 0) + amount;
    });

    res.json({
      success: true,
      data: {
        totalCollected,
        totalPayments: payments.length,
        byMethod,
        byCamp,
        payments,
      },
      filters: {
        camp_id,
        month,
        year,
        date_from,
        date_to,
      },
    });
  } catch (error) {
    console.error('Error generating collections report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate collections report',
      message: error.message,
    });
  }
};

/**
 * GET /api/reports/outstanding-balances
 * Outstanding balances report
 */
export const getOutstandingBalancesReport = async (req, res) => {
  try {
    const { camp_id, min_balance = 0 } = req.query;

    // Get latest monthly record for each room with balance > min_balance
    const records = await prisma.monthly_records.findMany({
      where: {
        camps: {
          tenant_id: req.tenantId,
        },
        ...(camp_id ? { camp_id } : {}),
        balance: {
          gt: parseFloat(min_balance),
        },
      },
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
      },
      orderBy: [{ balance: 'desc' }, { year: 'desc' }, { month: 'desc' }],
    });

    // Group by room to get only latest record per room
    const latestByRoom = {};
    records.forEach((record) => {
      const roomId = record.room_id;
      const recordDate = new Date(record.year, record.month - 1);

      if (
        !latestByRoom[roomId] ||
        recordDate > new Date(latestByRoom[roomId].year, latestByRoom[roomId].month - 1)
      ) {
        latestByRoom[roomId] = record;
      }
    });

    const outstandingRecords = Object.values(latestByRoom);

    // Calculate summary
    const summary = {
      totalRecords: outstandingRecords.length,
      totalOutstanding: 0,
      byCamp: {},
      byAging: {
        current: 0, // current month
        '30days': 0, // 1 month old
        '60days': 0, // 2 months old
        '90plus': 0, // 3+ months old
      },
    };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    outstandingRecords.forEach((record) => {
      const balance = Number(record.balance);
      summary.totalOutstanding += balance;

      // By camp
      const campName = record.camps.name;
      summary.byCamp[campName] = (summary.byCamp[campName] || 0) + balance;

      // By aging
      const recordDate = new Date(record.year, record.month - 1);
      const monthsDiff =
        (currentYear - record.year) * 12 + (currentMonth - record.month);

      if (monthsDiff === 0) {
        summary.byAging.current += balance;
      } else if (monthsDiff === 1) {
        summary.byAging['30days'] += balance;
      } else if (monthsDiff === 2) {
        summary.byAging['60days'] += balance;
      } else {
        summary.byAging['90plus'] += balance;
      }
    });

    res.json({
      success: true,
      data: {
        records: outstandingRecords,
        summary,
      },
      filters: {
        camp_id,
        min_balance: parseFloat(min_balance),
      },
    });
  } catch (error) {
    console.error('Error generating outstanding balances report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate outstanding balances report',
      message: error.message,
    });
  }
};
