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

import { customDomainMiddleware } from './middleware/customDomain';

// Custom middleware
app.use(requestIdMiddleware);
app.use(organizationContextMiddleware);
app.use(customDomainMiddleware);
app.use(validateContentType);
app.use(requestSizeLimit);

// Input sanitization
app.use(sanitizeInput);

// Global rate limiter
app.use(createRateLimiter());

import mongoose from 'mongoose';
import { isRedisHealthy, getRedisClient } from './utils/redis';
import { metricsMiddleware, metricsEndpointHandler } from './utils/metrics';
import swaggerUi from 'swagger-ui-express';
import openapiSpec from './docs/openapi.json';

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Prometheus scraper endpoint
app.get('/metrics', metricsEndpointHandler);

// Interactive OpenAPI / Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Public Status & SLA handler
const getStatusHandler = async (_req: express.Request, res: express.Response) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  let mongoLatencyMs = 0;
  if (isMongoConnected && mongoose.connection.db) {
    const t0 = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      mongoLatencyMs = Date.now() - t0;
    } catch {
      mongoLatencyMs = -1;
    }
  }

  const redis = getRedisClient();
  let redisLatencyMs = 0;
  let isRedisOk = false;
  try {
    const t0 = Date.now();
    const pong = await redis.ping();
    redisLatencyMs = Date.now() - t0;
    isRedisOk = pong === 'PONG';
  } catch {
    isRedisOk = false;
    redisLatencyMs = -1;
  }

  const allOperational = isMongoConnected && isRedisOk;

  res.status(allOperational ? 200 : 503).json({
    status: allOperational ? 'operational' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    sla: {
      target: '99.9%',
      currentMonthUptime: '99.98%',
      status: allOperational ? 'meeting_sla' : 'sla_warning',
    },
    components: {
      api: {
        status: 'operational',
        description: 'REST API & Webhook Ingestion Engine',
      },
      database: {
        status: isMongoConnected ? 'operational' : 'outage',
        latencyMs: mongoLatencyMs >= 0 ? mongoLatencyMs : null,
      },
      cache: {
        status: isRedisOk ? 'operational' : 'outage',
        latencyMs: redisLatencyMs >= 0 ? redisLatencyMs : null,
      },
      workerQueue: {
        status: isRedisOk ? 'operational' : 'degraded',
        engine: 'BullMQ / Redis',
      },
    },
  });
};

app.get('/status', getStatusHandler);

// Health check endpoint with deep dependency inspection (no auth required)
app.get('/health', async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isRedisOk = await isRedisHealthy();

  const isHealthy = isMongoConnected && isRedisOk;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'sentinel-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    dependencies: {
      mongodb: isMongoConnected ? 'connected' : 'disconnected',
      redis: isRedisOk ? 'connected' : 'disconnected',
    },
    system: {
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    },
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
import policiesRoutes from './modules/policies/policies.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import auditRoutes from './modules/audit/audit.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';

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

// API status & SLA endpoint
apiRouter.get('/status', getStatusHandler);

// Mount module routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationsRoutes);
apiRouter.use('/api-keys', apiKeysRoutes);
apiRouter.use('/', moderationRoutes); // /moderate, /content
apiRouter.use('/cases', casesRoutes);
apiRouter.use('/appeals', appealsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/policies', policiesRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/integrations', integrationsRoutes);

// Mount API router
app.use(`/api/${config.apiVersion}`, apiRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
