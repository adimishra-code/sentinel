import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config';
import logger from './utils/logger';
import {
  securityHeaders,
  corsOptions,
  createRateLimiter,
  sanitizeInput,
  requestIdMiddleware,
  organizationContextMiddleware,
  validateContentType,
  requestSizeLimit,
} from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors(corsOptions));

// Request processing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Custom middleware
app.use(requestIdMiddleware);
app.use(organizationContextMiddleware);
app.use(validateContentType);
app.use(requestSizeLimit);

// Input sanitization
app.use(sanitizeInput);

// Global rate limiter
app.use(createRateLimiter());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sentinel-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Import module routes
import authRoutes from './modules/auth/auth.routes';
import organizationsRoutes from './modules/organizations/organizations.routes';
import apiKeysRoutes from './modules/auth/api-keys.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import casesRoutes from './modules/cases/cases.routes';
import appealsRoutes from './modules/appeals/appeals.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

// API v1 routes
const apiRouter = express.Router();

// API health endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
  });
});

// Mount module routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationsRoutes);
apiRouter.use('/api-keys', apiKeysRoutes);
apiRouter.use('/', moderationRoutes); // /moderate, /content
apiRouter.use('/cases', casesRoutes);
apiRouter.use('/appeals', appealsRoutes);
apiRouter.use('/analytics', analyticsRoutes);

// Mount API router
app.use(`/api/${config.apiVersion}`, apiRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
