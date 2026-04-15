import express from 'express';
import { body } from 'express-validator';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as paymentsController from '../controllers/paymentsController.js';

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

export default router;
