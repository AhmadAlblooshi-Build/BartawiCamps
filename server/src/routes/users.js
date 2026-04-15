import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { enforceTenantFilter } from '../middleware/tenantFilter.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

// Apply authentication and tenant filter to all routes
router.use(authenticateToken);
router.use(enforceTenantFilter);

// GET /api/users - list all users
router.get('/', usersController.getUsers);

// GET /api/users/:userId - get single user
router.get('/:userId', usersController.getUser);

// POST /api/users - create new user
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('full_name').notEmpty().withMessage('Full name is required'),
  ],
  usersController.createUser
);

// PUT /api/users/:userId - update user
router.put('/:userId', usersController.updateUser);

// DELETE /api/users/:userId - delete user
router.delete('/:userId', usersController.deleteUser);

export default router;
