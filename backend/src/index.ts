import app from './app';
import config from './config';
import logger from './utils/logger';
import mongoose from 'mongoose';
import Redis from 'ioredis';

let redisClient: Redis;

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info('Connected to MongoDB', { uri: config.mongo.uri.replace(/\/\/.*@/, '//***@') });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
};

const connectRedis = async () => {
  try {
    redisClient = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis', { url: config.redis.url });
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });

    await redisClient.ping();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
};

const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Sentinel Backend started`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
        apiVersion: config.apiVersion,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          await redisClient.quit();
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
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
