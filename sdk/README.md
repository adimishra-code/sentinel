# @sentinel/sdk

Official Node.js & TypeScript client SDK for Sentinel — the AI Trust & Safety Operations Platform.

## Installation

```bash
npm install @sentinel/sdk
```

## Quickstart

```typescript
import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({
  apiKey: 'sk_live_your_api_key_here',
  baseUrl: 'https://api.sentinelops.com', // optional
});

// 1. Moderate content synchronously
const result = await sentinel.moderate({
  text: 'Hello, world!',
  authorId: 'user_123',
});

console.log(result.action);    // 'allow' | 'warn' | 'remove' | 'escalate'
console.log(result.riskScore); // 0.0 to 1.0

// 2. Moderate asynchronously (recommended for heavy content)
const queued = await sentinel.moderate({
  text: 'High-throughput content stream',
  async: true,
});

console.log(queued.jobId);

// Poll for job completion or listen via webhooks
const finalResult = await sentinel.waitForJob(queued.jobId!);

// 3. Verify incoming webhook signatures
const isValid = sentinel.verifyWebhook(
  rawRequestBody,
  req.headers['x-sentinel-signature'],
  process.env.SENTINEL_WEBHOOK_SECRET
);
```
