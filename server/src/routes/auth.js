import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login - User login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController.refresh);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user (requires authentication)
router.get('/me', authenticateToken, authController.getMe);

export default router;
