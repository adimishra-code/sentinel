import { Queue, Worker, Job } from 'bullmq';
import config from '../config';
import logger from './logger';
import * as moderationService from '../modules/moderation/moderation.service';
import { getIO } from './socket';

// Parse Redis URL for BullMQ connection options
const parseRedisConnection = () => {
  try {
    const url = new URL(config.redis.url);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '6379', 10),
      password: url.password ? decodeURIComponent(url.password) : undefined,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
};

const connection = parseRedisConnection();

export const MODERATION_QUEUE_NAME = 'moderation-queue';

export interface ModerationJobData {
  organizationId: string;
  input: any;
  priority?: number;
  metadata?: Record<string, unknown>;
}

// BullMQ Queue instance
export const moderationQueue = new Queue(MODERATION_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // keep 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 48 * 3600,
    },
  },
});

// Enqueue helper
export const enqueueModeration = async (
  organizationId: string,
  input: any,
  options?: { priority?: number; metadata?: Record<string, unknown> }
) => {
  const job = await moderationQueue.add(
    'moderate-content',
    {
      organizationId,
      input,
      metadata: options?.metadata,
    },
    {
      priority: options?.priority ?? 5,
    }
  );

  logger.info('Moderation job enqueued', { jobId: job.id, organizationId });
  return job;
};

// BullMQ Worker instance
let moderationWorker: Worker | null = null;

export const startModerationWorker = () => {
  if (moderationWorker) return moderationWorker;

  moderationWorker = new Worker(
    MODERATION_QUEUE_NAME,
    async (job: Job<ModerationJobData>) => {
      logger.info('Processing moderation job', { jobId: job.id, organizationId: job.data.organizationId });
      const { organizationId, input } = job.data;
      
      const result = await moderationService.moderateContent(organizationId, input);

      // Broadcast event to organization room via Socket.IO if available
      try {
        const io = getIO();
        if (io) {
          io.to(`org:${organizationId}`).emit('moderation.completed', {
            jobId: job.id,
            result,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketErr) {
        // Socket broadcast is non-critical
      }

      return result;
    },
    {
      connection,
      concurrency: 5,
    }
  );

  moderationWorker.on('completed', (job: Job) => {
    logger.info('Moderation job completed', { jobId: job.id });
  });

  moderationWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error('Moderation job failed', { jobId: job?.id, error: err.message });
  });

  return moderationWorker;
};

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery-queue';

export interface WebhookJobData {
  webhookId: string;
  organizationId: string;
  url: string;
  event: string;
  payload: string;
  signature: string;
}

export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
  },
});

export const enqueueWebhookRetry = async (data: WebhookJobData) => {
  return webhookQueue.add('retry-webhook', data);
};

let webhookWorker: Worker | null = null;

export const startWebhookWorker = () => {
  if (webhookWorker) return webhookWorker;

  const axios = require('axios');
  webhookWorker = new Worker(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      const { url, payload, signature, event } = job.data;
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Signature': signature,
          'X-Sentinel-Event': event,
          'X-Sentinel-Delivery': job.id || 'retry',
        },
        timeout: 10000,
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Webhook target responded with status ${res.status}`);
      }
      return { status: res.status };
    },
    {
      connection,
      concurrency: 5,
    }
  );

  return webhookWorker;
};

export const closeQueue = async () => {
  if (moderationWorker) {
    await moderationWorker.close();
    moderationWorker = null;
  }
  if (webhookWorker) {
    await webhookWorker.close();
    webhookWorker = null;
  }
  await moderationQueue.close();
  await webhookQueue.close();
};
