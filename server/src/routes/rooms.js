import express from 'express';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as roomsController from '../controllers/roomsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/rooms/:roomId - single room with full details
router.get('/:roomId', roomsController.getRoomDetails);

export default router;
