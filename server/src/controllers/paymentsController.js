import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * GET /api/payments
 * List all payments with filters
 */
export const getPayments = async (req, res) => {
  try {
    const {
      camp_id,
      room_id,
      payment_method,
      date_from,
      date_to,
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
    if (payment_method) where.payment_method = payment_method;

    if (date_from || date_to) {
      where.payment_date = {};
      if (date_from) where.payment_date.gte = new Date(date_from);
      if (date_to) where.payment_date.lte = new Date(date_to);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.payments.count({ where });

    // Fetch payments
    const payments = await prisma.payments.findMany({
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
        monthly_records: {
          select: {
            month: true,
            year: true,
            rent: true,
            paid: true,
            balance: true,
          },
        },
        users: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: {
        payment_date: 'desc',
      },
      skip,
      take,
    });

    // Calculate summary
    const summary = payments.reduce(
      (acc, payment) => {
        acc.totalAmount += Number(payment.amount);
        acc.byMethod[payment.payment_method] =
          (acc.byMethod[payment.payment_method] || 0) + Number(payment.amount);
        return acc;
      },
      { totalAmount: 0, byMethod: {} }
    );

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/:paymentId
 * Get single payment details
 */
export const getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payments.findFirst({
      where: {
        id: paymentId,
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
        monthly_records: {
          include: {
            individuals: true,
            companies: true,
          },
        },
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/room/:roomId
 * Get payment history for a specific room
 */
export const getRoomPayments = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { year, month } = req.query;

    // Verify room belongs to tenant
    const room = await prisma.rooms.findFirst({
      where: {
        id: roomId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    // Build where clause
    const where = {
      room_id: roomId,
    };

    // Optional filters via monthly_records
    if (year || month) {
      where.monthly_records = {};
      if (year) where.monthly_records.year = parseInt(year);
      if (month) where.monthly_records.month = parseInt(month);
    }

    const payments = await prisma.payments.findMany({
      where,
      include: {
        monthly_records: {
          select: {
            month: true,
            year: true,
            rent: true,
            paid: true,
            balance: true,
          },
        },
        users: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: {
        payment_date: 'desc',
      },
    });

    // Calculate total
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      success: true,
      data: payments,
      summary: {
        totalPayments: payments.length,
        totalPaid,
      },
    });
  } catch (error) {
    console.error('Error fetching room payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room payments',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments
 * Log a payment against a monthly record
 */
export const createPayment = async (req, res) => {
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
      monthly_record_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      bank_name,
      cheque_number,
      notes,
    } = req.body;

    // Verify monthly record exists and belongs to tenant
    const monthlyRecord = await prisma.monthly_records.findFirst({
      where: {
        id: monthly_record_id,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        rooms: {
          select: {
            camp_id: true,
          },
        },
      },
    });

    if (!monthlyRecord) {
      return res.status(404).json({
        success: false,
        error: 'Monthly record not found',
      });
    }

    // Check if record is locked
    if (monthlyRecord.is_locked) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add payment to locked monthly record',
      });
    }

    // Create payment and update monthly record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payments.create({
        data: {
          monthly_record_id,
          room_id: monthlyRecord.room_id,
          camp_id: monthlyRecord.rooms.camp_id,
          amount,
          payment_method,
          payment_date: new Date(payment_date),
          reference_number,
          bank_name,
          cheque_number,
          notes,
          // received_by: req.userId, // TODO: Set when auth is implemented
        },
      });

      // Update monthly record's paid amount
      const updatedRecord = await tx.monthly_records.update({
        where: { id: monthly_record_id },
        data: {
          paid: {
            increment: amount,
          },
          updated_at: new Date(),
        },
        select: {
          id: true,
          rent: true,
          paid: true,
          balance: true,
        },
      });

      return { payment, updatedRecord };
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment: result.payment,
        monthlyRecord: result.updatedRecord,
      },
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment',
      message: error.message,
    });
  }
};
