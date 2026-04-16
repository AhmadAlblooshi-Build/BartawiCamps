import express from 'express';
import { body } from 'express-validator';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as complaintsController from '../controllers/complaintsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/complaints - list complaints with filters
router.get('/', complaintsController.getComplaints);

// POST /api/complaints - create a new complaint
router.post(
  '/',
  [
    body('camp_id').notEmpty().withMessage('Camp ID is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
  ],
  complaintsController.createComplaint
);

// GET /api/complaints/:complaintId - get single complaint
router.get('/:complaintId', complaintsController.getComplaint);

// PUT /api/complaints/:complaintId - update complaint
router.put('/:complaintId', complaintsController.updateComplaint);

// POST /api/complaints/:complaintId/assign - assign complaint to user
router.post('/:complaintId/assign', complaintsController.assignComplaint);

// POST /api/complaints/:complaintId/resolve - resolve complaint
router.post('/:complaintId/resolve', complaintsController.resolveComplaint);

export default router;
