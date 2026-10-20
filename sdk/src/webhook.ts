import * as crypto from 'crypto';

/**
 * Verify HMAC-SHA256 signature on an incoming Sentinel webhook with replay protection.
 *
 * The webhook payload is signed as `timestamp.body`, where `timestamp` is the epoch ms
 * at signing time. The signature covers `timestamp.body`. This binds the signature to a
 * specific time, allowing receivers to reject stale signatures (replay protection).
 *
 * @param payload Raw request payload string or Buffer as received (format: "timestamp.body")
 * @param signature Hex signature string from `X-Sentinel-Signature` header
 * @param secret Webhook secret key
 * @param timestampToleranceMs Allowed clock skew in ms (default 5 minutes)
 * @returns boolean indicating if the signature is valid
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string,
  timestampToleranceMs: number = 5 * 60 * 1000
): boolean => {
  if (!signature || !secret) {
    return false;
  }

  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');

  // Expected signature format: sha256=<hex>
  const match = signature.match(/^sha256=([0-9a-f]+)$/i);
  if (!match) {
    return false;
  }
  const receivedSig = match[1];

  // Payload is "timestamp.body" — split on the first dot
  const dotIndex = payloadString.indexOf('.');
  if (dotIndex <= 0) {
    return false;
  }

  const timestampStr = payloadString.slice(0, dotIndex);
  const body = payloadString.slice(dotIndex + 1);

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
  const expectedBuffer = Buffer.from(
    crypto.createHmac('sha256', secret).update(signedPayload).digest('hex'),
    'hex'
  );
  const receivedBuffer = Buffer.from(receivedSig, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};
