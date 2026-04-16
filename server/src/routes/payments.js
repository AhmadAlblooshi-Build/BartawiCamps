import express from 'express';
import { body } from 'express-validator';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as paymentsController from '../controllers/paymentsController.js';
import prisma from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/payments - list all payments with filters
router.get('/', paymentsController.getPayments);

// GET /api/payments/room/:roomId - get payment history for a room
router.get('/room/:roomId', paymentsController.getRoomPayments);

// GET /api/payments/:paymentId - get single payment details
router.get('/:paymentId', paymentsController.getPayment);

// POST /api/payments - log a payment against a monthly record
router.post(
  '/',
  [
    body('monthly_record_id').notEmpty().withMessage('Monthly record ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_method')
      .isIn(['cash', 'cheque', 'bank_transfer', 'card'])
      .withMessage('Invalid payment method'),
    body('payment_date').isISO8601().withMessage('Valid payment date is required'),
  ],
  paymentsController.createPayment
);

// GET /api/payments/:id/receipt-data - get structured data for receipt PDF generation
router.get('/:id/receipt-data', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payments.findFirst({
      where: {
        id,
      },
      include: {
        monthly_records: {
          include: {
            rooms: { select: { room_number: true, camp_id: true } },
            camps: { select: { name: true } },
            individuals: { select: { owner_name: true } },
            companies: { select: { name: true } },
          },
        },
        users: { select: { full_name: true } },
      },
    });

    if (!payment) {
      throw new ApiError('NOT_FOUND', 'Payment not found', 404);
    }

    // Resolve tenant name
    const tenant_name = payment.monthly_records.companies?.name || payment.monthly_records.individuals?.owner_name || 'Unknown';

    // Generate receipt number (payments don't have auto-generated numbers, use ID prefix)
    const receipt_number = `BT-PMT-${payment.id.substring(0, 8).toUpperCase()}`;

    const receipt_data = {
      receipt_number,
      date: payment.payment_date,
      tenant: tenant_name,
      room: payment.monthly_records.rooms.room_number,
      camp: payment.monthly_records.camps.name,
      amount: payment.amount,
      currency: 'AED',
      payment_method: payment.payment_method,
      payment_reference: payment.payment_reference,
      received_by: payment.users?.full_name || 'System',
      period: `${payment.monthly_records.month}/${payment.monthly_records.year}`,
      issuing_entity: 'Bartawi Camp Management',
      notes: payment.notes,
    };

    res.json({ receipt_data });
  } catch (error) {
    next(error);
  }
});

export default router;
