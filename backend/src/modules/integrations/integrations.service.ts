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
import { validateWebhookUrl, isBlockedIp } from '../../utils/ssrf';

const MAX_FAILURES = 5;
const DELIVERY_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB response size cap

/**
 * Generate a webhook secret
 */
const generateSecret = () => crypto.randomBytes(32).toString('hex');

/**
 * Sign webhook payload with HMAC-SHA256.
 * Includes a timestamp in the signed payload for replay protection.
 */
const signPayload = (payload: string, secret: string, timestamp: number): string => {
  const signedPayload = `${timestamp}.${payload}`;
  return `sha256=${crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')}`;
};

/**
 * Verify a webhook signature with timestamp tolerance (replay protection).
 * @param signature - The X-Sentinel-Signature header value
 * @param payload - The raw request body string
 * @param secret - The webhook secret
 * @param timestampToleranceMs - Allowed clock skew in ms (default 5 minutes)
 */
export const verifyWebhookSignature = (
  signature: string,
  payload: string,
  secret: string,
  timestampToleranceMs: number = 5 * 60 * 1000,
): boolean => {
  if (!signature || !secret) {
    return false;
  }

  // Expected format: sha256=<hex>
  const match = signature.match(/^sha256=([0-9a-f]+)$/i);
  if (!match) {
    return false;
  }
  const receivedSig = match[1];

  // The payload is timestamped: "timestamp.jsonbody"
  const dotIndex = payload.indexOf('.');
  if (dotIndex <= 0) {
    return false;
  }

  const timestampStr = payload.slice(0, dotIndex);
  const body = payload.slice(dotIndex + 1);

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  // Replay protection: reject timestamps outside the tolerance window
  const now = Date.now();
  if (Math.abs(now - timestamp) > timestampToleranceMs) {
    return false;
  }

  const signedPayload = `${timestamp}.${body}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const sigBuffer = Buffer.from(receivedSig, 'hex');
  const expectedBuffer = Buffer.from(expectedSig, 'hex');
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
};

/**
 * Create a webhook with SSRF-validated URL
 */
export const createWebhook = async (
  organizationId: string,
  input: { name: string; url: string; events: WebhookEvent[] }
) => {
  // SSRF validation: block private/loopback/link-local/metadata URLs
  await validateWebhookUrl(input.url);

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

  const body = JSON.stringify({
    event,
    organizationId,
    timestamp: new Date().toISOString(),
    data,
  });
  const timestamp = Date.now();
  const signedPayload = `${timestamp}.${body}`;

  const deliveries = webhooks.map(async (webhook) => {
    // DNS rebinding defense: re-validate URL at delivery time
    try {
      await validateWebhookUrl(webhook.url);
    } catch {
      webhook.failureCount += 1;
      webhook.lastDeliveryStatus = 'failure';
      if (webhook.failureCount >= MAX_FAILURES) {
        webhook.active = false;
        logger.warn('Webhook disabled due to SSRF violation', {
          webhookId: webhook._id,
          url: webhook.url,
        });
      }
      await webhook.save().catch(() => {});
      return;
    }

    const signature = signPayload(body, webhook.secret, timestamp);
    let success = false;
    let statusCode: number | undefined;
    let responseBody: string | undefined;

    try {
      const response = await axios.post(webhook.url, signedPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Signature': signature,
          'X-Sentinel-Event': event,
          'X-Sentinel-Delivery': crypto.randomUUID(),
        },
        timeout: DELIVERY_TIMEOUT_MS,
        maxRedirects: 0, // Disable redirects (SSRF defense)
        maxContentLength: MAX_RESPONSE_BYTES, // Response size cap
        validateStatus: () => true,
      });

      statusCode = response.status;
      responseBody =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
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
        payload: signedPayload,
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
      payload: JSON.parse(body),
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
