import * as Sentry from '@sentry/node';
import app from './app';
import config from './config';
import logger from './utils/logger';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { initializeSocket } from './utils/socket';
import { getRedisClient, closeRedis } from './utils/redis';
import { startModerationWorker, startWebhookWorker, closeQueue } from './utils/queue';

// Initialize Sentry before everything else if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.nodeEnv,
    tracesSampleRate: config.nodeEnv === 'production' ? 0.2 : 1.0,
  });
  logger.info('Sentry error monitoring initialized');
}

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongo.uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('Connected to MongoDB with connection pool', {
      maxPoolSize: 20,
      minPoolSize: 5,
      uri: config.mongo.uri.replace(/\/\/.*@/, '//***@'),
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    throw error;
  }
};

const connectRedis = async () => {
  try {
    const redis = getRedisClient();
    await redis.ping();
    logger.info('Connected to Redis cache and rate limiter');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    throw error;
  }
};

const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Start async moderation queue worker & webhook retry worker
    try {
      startModerationWorker();
      startWebhookWorker();
      logger.info('BullMQ workers initialized');
    } catch (queueErr) {
      logger.warn('Failed to start BullMQ workers', { error: queueErr });
    }

    // Create HTTP server and initialize Socket.IO
    const httpServer = createServer(app);
    initializeSocket(httpServer);

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`Sentinel Backend started`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
        apiVersion: config.apiVersion,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeQueue();
          logger.info('BullMQ queue closed');

          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          await closeRedis();
          logger.info('Redis connection closed');

          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
      }
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
