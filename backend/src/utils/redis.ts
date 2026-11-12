import Redis from 'ioredis';
import config from '../config';
import logger from './logger';

let client: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: process.env.NODE_ENV === 'test' ? 1 : 3,
      enableReadyCheck: process.env.NODE_ENV !== 'test',
      lazyConnect: process.env.NODE_ENV === 'test',
      retryStrategy: (times: number) => {
        if (process.env.NODE_ENV === 'test' || times > 3) {
          return null; // Stop retrying in tests or after 3 attempts
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    client.on('connect', () => {
      logger.info('Connected to Redis', { url: config.redis.url.replace(/\/\/.*@/, '//***@') });
    });

    client.on('error', (err: Error) => {
      logger.error('Redis error', { message: err.message });
    });
  }

  return client;
};

export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    const c = getRedisClient();
    const res = await c.ping();
    return res === 'PONG';
  } catch (error) {
    return false;
  }
};

export const closeRedis = async (): Promise<void> => {
  if (client) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    } finally {
      client = null;
    }
  }
};
