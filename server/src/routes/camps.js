import express from 'express';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as campsController from '../controllers/campsController.js';

const router = express.Router();

// Apply tenant filter to all routes
router.use(enforceTenantFilter);

// GET /api/camps - list all camps for the tenant
router.get('/', campsController.getAllCamps);

// GET /api/camps/:campId/dashboard - occupancy stats + financial summary
router.get('/:campId/dashboard', campsController.getCampDashboard);

// GET /api/camps/:campId/buildings - all buildings with blocks and room counts
router.get('/:campId/buildings', campsController.getCampBuildings);

// GET /api/camps/:campId/rooms - all rooms for a camp with current status
router.get('/:campId/rooms', campsController.getCampRooms);

export default router;
