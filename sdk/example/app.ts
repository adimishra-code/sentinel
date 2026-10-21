import express from 'express';
import crypto from 'crypto';
import { Sentinel } from '@sentinel/sdk';

const app = express();
app.use(express.raw({ type: '*/*' }));

// Initialize SDK client
const sentinel = new Sentinel({
  apiKey: process.env.SENTINEL_API_KEY || 'sk_live_example',
  baseUrl: process.env.SENTINEL_BASE_URL || 'http://localhost:3000',
  timeoutMs: 15000,
  maxRetries: 3,
});

const WEBHOOK_SECRET = process.env.SENTINEL_WEBHOOK_SECRET || 'whsec_example';

/**
 * 1. Moderate content submitted by a user
 */
app.post('/moderate', async (req, res) => {
  try {
    const { text, authorId } = req.body;

    const result = await sentinel.moderate({
      text,
      authorId,
      idempotencyKey: req.header('Idempotency-Key'), // safe retries
    });

    res.json({
      decision: result.action,
      riskScore: result.riskScore,
      requiresHumanReview: result.requiresHumanReview,
      contentId: result.contentId,
      caseId: result.caseId,
    });
  } catch (err: any) {
    if (err instanceof Sentinel.SentinelError) {
      res.status(err.status).json({ error: err.code, message: err.message });
    } else {
      res.status(502).json({ error: 'MODERATION_ERROR', message: err.message });
    }
  }
});

/**
 * 2. Verify incoming Sentinel webhook signatures (replay-protected)
 */
app.post('/webhooks/case-resolved', (req, res) => {
  const signature = req.headers['x-sentinel-signature'];
  const rawBody = req.body.toString();

  if (!signature) {
    return res.status(401).json({ error: 'MISSING_SIGNATURE' });
  }

  const isValid = sentinel.verifyWebhook(rawBody, signature, WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  const payload = JSON.parse(rawBody.slice(rawBody.indexOf('.') + 1));
  console.log('Verified webhook:', payload.event, payload.data);

  res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Example SDK app listening on http://localhost:${PORT}`);
});
