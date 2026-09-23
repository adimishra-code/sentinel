import * as crypto from 'crypto';

/**
 * Verify HMAC-SHA256 signature on an incoming Sentinel webhook
 *
 * @param payload Raw request payload string or Buffer
 * @param signature Hex signature string from `X-Sentinel-Signature` header
 * @param secret Webhook secret key
 * @returns boolean indicating if the signature is valid
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean => {
  if (!signature || !secret) {
    return false;
  }

  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};
