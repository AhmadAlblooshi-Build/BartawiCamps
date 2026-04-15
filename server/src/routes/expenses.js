import express from 'express';
import { body } from 'express-validator';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as expensesController from '../controllers/expensesController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/expenses - list all expenses with filters
router.get('/', expensesController.getExpenses);

// GET /api/expenses/:expenseId - get single expense
router.get('/:expenseId', expensesController.getExpense);

// POST /api/expenses - create new expense
router.post(
  '/',
  [
    body('camp_id').notEmpty().withMessage('Camp ID is required'),
    body('category_id').notEmpty().withMessage('Category ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').notEmpty().withMessage('Description is required'),
    body('expense_date').isISO8601().withMessage('Valid expense date is required'),
  ],
  expensesController.createExpense
);

// PUT /api/expenses/:expenseId - update expense
router.put('/:expenseId', expensesController.updateExpense);

// DELETE /api/expenses/:expenseId - delete expense
router.delete('/:expenseId', expensesController.deleteExpense);

export default router;
