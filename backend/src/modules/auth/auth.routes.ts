import { Router } from 'express';
import { createRateLimiter } from '../../middleware/security';
import { authenticate } from '../../middleware/auth.middleware';
import * as authController from './auth.controller';

const router = Router();

// Strict rate limiting for auth endpoints
const authRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
});

// Public routes
router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
