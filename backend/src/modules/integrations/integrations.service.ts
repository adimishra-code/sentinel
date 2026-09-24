/**
 * Integrations Service
 * Webhook management and signed event delivery
 */

import crypto from 'crypto';
import axios from 'axios';
import { Webhook, WebhookDelivery, WebhookEvent } from './webhook.model';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';
import { enqueueWebhookRetry } from '../../utils/queue';

const MAX_FAILURES = 5;
const DELIVERY_TIMEOUT_MS = 10000;

/**
 * Generate a webhook secret
 */
const generateSecret = () => crypto.randomBytes(32).toString('hex');

/**
 * Sign webhook payload with HMAC-SHA256
 */
const signPayload = (payload: string, secret: string): string => {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
};

/**
 * Create a webhook
 */
export const createWebhook = async (
  organizationId: string,
  input: { name: string; url: string; events: WebhookEvent[] }
) => {
  const secret = generateSecret();
  const webhook = await Webhook.create({
    organizationId,
    name: input.name,
    url: input.url,
    secret,
    events: input.events,
    active: true,
  });

  return {
    id: webhook._id.toString(),
    name: webhook.name,
    url: webhook.url,
    secret, // Only returned on creation
    events: webhook.events,
    active: webhook.active,
    createdAt: webhook.createdAt,
  };
};

/**
 * List webhooks for organization
 */
export const listWebhooks = async (organizationId: string) => {
  const webhooks = await Webhook.find({ organizationId }).sort({ createdAt: -1 }).lean();
  return webhooks.map((w) => ({
    id: w._id.toString(),
    name: w.name,
    url: w.url,
    events: w.events,
    active: w.active,
    failureCount: w.failureCount,
    lastDeliveryAt: w.lastDeliveryAt,
    lastDeliveryStatus: w.lastDeliveryStatus,
    createdAt: w.createdAt,
  }));
};

/**
 * Delete a webhook
 */
export const deleteWebhook = async (webhookId: string, organizationId: string) => {
  const webhook = await Webhook.findOneAndDelete({ _id: webhookId, organizationId });
  if (!webhook) throw AppError.notFound('Webhook not found');
};

/**
 * Get webhook deliveries
 */
export const getWebhookDeliveries = async (webhookId: string, organizationId: string) => {
  const webhook = await Webhook.findOne({ _id: webhookId, organizationId });
  if (!webhook) throw AppError.notFound('Webhook not found');

  const deliveries = await WebhookDelivery.find({ webhookId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return deliveries.map((d) => ({
    id: d._id.toString(),
    event: d.event,
    success: d.success,
    statusCode: d.statusCode,
    attemptCount: d.attemptCount,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
  }));
};

/**
 * Deliver an event to all matching webhooks for an organization
 */
export const deliverEvent = async (
  organizationId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> => {
  const webhooks = await Webhook.find({
    organizationId,
    active: true,
    events: event,
    failureCount: { $lt: MAX_FAILURES },
  }).select('+secret');

  if (webhooks.length === 0) return;

  const payload = JSON.stringify({
    event,
    organizationId,
    timestamp: new Date().toISOString(),
    data,
  });

  const deliveries = webhooks.map(async (webhook) => {
    const signature = signPayload(payload, webhook.secret);
    let success = false;
    let statusCode: number | undefined;
    let responseBody: string | undefined;

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Signature': signature,
          'X-Sentinel-Event': event,
          'X-Sentinel-Delivery': crypto.randomUUID(),
        },
        timeout: DELIVERY_TIMEOUT_MS,
        validateStatus: () => true,
      });

      statusCode = response.status;
      responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      success = response.status >= 200 && response.status < 300;

      if (success) {
        webhook.failureCount = 0;
        webhook.lastDeliveryStatus = 'success';
      } else {
        webhook.failureCount += 1;
        webhook.lastDeliveryStatus = 'failure';
      }
    } catch (err) {
      webhook.failureCount += 1;
      webhook.lastDeliveryStatus = 'failure';
      responseBody = String(err);

      if (webhook.failureCount >= MAX_FAILURES) {
        webhook.active = false;
        logger.warn('Webhook disabled due to consecutive failures', {
          webhookId: webhook._id,
          url: webhook.url,
        });
      }

      // Enqueue exponential backoff retry via BullMQ
      enqueueWebhookRetry({
        webhookId: webhook._id.toString(),
        organizationId,
        url: webhook.url,
        event,
        payload,
        signature,
      }).catch((queueErr) => {
        logger.warn('Failed to enqueue webhook retry', { error: queueErr });
      });
    }

    webhook.lastDeliveryAt = new Date();
    await webhook.save();

    await WebhookDelivery.create({
      webhookId: webhook._id,
      organizationId,
      event,
      payload: JSON.parse(payload),
      statusCode,
      responseBody: responseBody?.substring(0, 500),
      success,
      deliveredAt: success ? new Date() : undefined,
    });

    logger.info('Webhook delivery attempted', {
      webhookId: webhook._id,
      event,
      success,
      statusCode,
    });
  });

  await Promise.allSettled(deliveries);
};
