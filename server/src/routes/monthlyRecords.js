import express from 'express';
import { body } from 'express-validator';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as monthlyRecordsController from '../controllers/monthlyRecordsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// POST /api/monthly-records/lock - lock records for a period (MUST be before /:recordId)
router.post('/lock', monthlyRecordsController.lockMonthlyRecords);

// GET /api/monthly-records - list with filters
router.get('/', monthlyRecordsController.getMonthlyRecords);

// GET /api/monthly-records/:recordId - get single record
router.get('/:recordId', monthlyRecordsController.getMonthlyRecord);

// POST /api/monthly-records - create new record
router.post(
  '/',
  [
    body('room_id').notEmpty().withMessage('Room ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2020 }).withMessage('Valid year is required'),
    body('rent').isFloat({ min: 0 }).withMessage('Rent must be a positive number'),
  ],
  monthlyRecordsController.createMonthlyRecord
);

// PUT /api/monthly-records/:recordId - update record
router.put('/:recordId', monthlyRecordsController.updateMonthlyRecord);

export default router;
