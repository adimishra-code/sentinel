# @sentinel/sdk

Official TypeScript & JavaScript client SDK for the Sentinel Trust & Safety Platform.

## Installation

```bash
npm install @sentinel/sdk
```

## Quickstart

```typescript
import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({
  apiKey: process.env.SENTINEL_API_KEY!,   // from your Sentinel dashboard
  baseUrl: 'https://api.sentinelops.com',   // optional, defaults to production
  timeoutMs: 15000,
  maxRetries: 3,
});

// 1. Moderate content synchronously
const result = await sentinel.moderate({
  text: 'Hello, world!',
  authorId: 'user_123',
});

console.log(result.action);    // 'allow' | 'allow_and_monitor' | 'remove' | 'review'
console.log(result.riskScore); // 0.0 to 1.0
console.log(result.categories); // e.g. ['toxicity']

// 2. Moderate asynchronously (recommended for heavy/high-volume content)
const queued = await sentinel.moderate({
  text: 'High-throughput content stream',
  async: true,
  idempotencyKey: 'unique-request-id', // safe retries — same key returns cached result
});

console.log(queued.jobId);

// Poll for completion or wait automatically
const finalResult = await sentinel.waitForJob(queued.jobId!);

// 3. Look up content by ID
const content = await sentinel.getContent(result.contentId);

// 4. Verify incoming webhook signatures (replay-protected)
const isValid = sentinel.verifyWebhook(
  rawRequestBody,         // raw request body string/Buffer
  req.headers['x-sentinel-signature'],
  process.env.SENTINEL_WEBHOOK_SECRET!
);
```

## API Reference

### `new Sentinel(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your Sentinel API key |
| `baseUrl` | `string` | `https://api.sentinelops.com` | API base URL |
| `timeoutMs` | `number` | `15000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Max retry attempts on transient errors |

### `sentinel.moderate(request)`

Submit content for moderation. Returns a `ModerationResult`.

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Content text to moderate |
| `contentType` | `'text' \| 'image' \| 'url' \| 'mixed'` | `'text'` |
| `imageUrls` | `string[]` | Image URLs |
| `urls` | `string[]` | URL strings |
| `authorId` | `string` | Author identifier |
| `targetId` | `string` | Target identifier |
| `conversationId` | `string` | Conversation thread ID |
| `sourcePlatform` | `string` | Source platform name |
| `metadata` | `Record<string, unknown>` | Extra metadata |
| `async` | `boolean` | Return a job ID instead of waiting |
| `idempotencyKey` | `string` | Client-generated key for safe retries |

### `sentinel.getJobStatus(jobId)`

Poll the status of an asynchronous moderation job.

### `sentinel.waitForJob(jobId, intervalMs?, maxWaitMs?)`

Poll until the job completes, fails, or times out (default 30s).

### `sentinel.getContent(contentId)`

Fetch a previously moderated content item by ID.

### `sentinel.verifyWebhook(payload, signature, secret)`

Verify an incoming webhook's HMAC-SHA256 signature with replay protection. Returns `true` if valid and within the 5-minute timestamp tolerance.

## Example App

See [`example/app.ts`](./example/app.ts) for a complete Express server that:
1. Moderates submitted content via the SDK
2. Verifies incoming webhook signatures

```bash
cd example
npm install @sentinel/sdk express
SENTINEL_API_KEY=sk_live_xxx SENTINEL_WEBHOOK_SECRET=whsec_xxx npx tsx app.ts
```

## Errors

All SDK failures throw a `SentinelError` with `status`, `code`, and optional `details`:

```typescript
import { SentinelError } from '@sentinel/sdk';

try {
  await sentinel.moderate({ text: '...' });
} catch (err) {
  if (err instanceof SentinelError) {
    console.error(err.status, err.code, err.message, err.details);
  }
}
```

## Versioning

This SDK follows [Semantic Versioning](https://semver.org/). Breaking changes are only introduced in major versions.

## License

Apache-2.0
