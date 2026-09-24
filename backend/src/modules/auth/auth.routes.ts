import { Router } from 'express';
import { createRateLimiter } from '../../middleware/security';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { RegisterSchema, LoginSchema, RefreshTokenSchema, SSOCallbackSchema } from '../../types/schemas';
import * as authController from './auth.controller';

const router = Router();

// Strict rate limiting for auth endpoints
const authRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
});

// Public routes with Zod validation
router.post('/register', authRateLimit, validateBody(RegisterSchema), authController.register);
router.post('/login', authRateLimit, validateBody(LoginSchema), authController.login);
router.post('/sso/callback', authRateLimit, validateBody(SSOCallbackSchema), authController.ssoCallback);
router.post('/refresh', validateBody(RefreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
