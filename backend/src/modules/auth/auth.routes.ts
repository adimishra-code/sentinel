import { Router } from 'express';
import { createRateLimiter } from '../../middleware/security';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  SSOCallbackSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  Verify2FASchema,
  Enable2FASchema,
  NotificationPreferenceSchema,
} from '../../types/schemas';
import * as authController from './auth.controller';
import * as mfaController from './mfa.controller';
import * as preferenceController from '../notifications/preference.controller';

const router = Router();

// Strict rate limiting for auth endpoints
const authRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
});

// Stricter rate limiting for password reset
const resetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
});

// Public routes with Zod validation
router.post('/register', authRateLimit, validateBody(RegisterSchema), authController.register);
router.post('/login', authRateLimit, validateBody(LoginSchema), authController.login);
router.post('/sso/callback', authRateLimit, validateBody(SSOCallbackSchema), authController.ssoCallback);
router.post('/refresh', validateBody(RefreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

// Password change (protected)
router.post(
  '/change-password',
  authenticate,
  validateBody(ChangePasswordSchema),
  authController.changePassword
);

// Forgot / reset password (public, rate limited)
router.post(
  '/forgot-password',
  resetRateLimit,
  validateBody(ForgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  resetRateLimit,
  validateBody(ResetPasswordSchema),
  authController.resetPassword
);

// Sessions (protected)
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);
router.post('/sessions/revoke-all', authenticate, authController.revokeAllSessions);

// MFA / 2FA (protected)
router.post('/2fa/setup', authenticate, mfaController.setup2fa);
router.post('/2fa/enable', authenticate, validateBody(Enable2FASchema), mfaController.enable2fa);
router.post('/2fa/verify', authenticate, validateBody(Verify2FASchema), mfaController.verify2fa);
router.post('/2fa/disable', authenticate, mfaController.disable2fa);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

// Notification preferences (protected)
router.get(
  '/notifications/preferences',
  authenticate,
  preferenceController.getPreferences
);
router.put(
  '/notifications/preferences',
  authenticate,
  validateBody(NotificationPreferenceSchema),
  preferenceController.setPreference
);

export default router;
