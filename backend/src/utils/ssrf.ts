/**
 * SSRF (Server-Side Request Forgery) protection utilities
 * Validates outbound URLs to prevent requests to internal/private/metadata networks.
 */

import { URL } from 'url';
import { lookup as dnsLookup } from 'dns';
import { promisify } from 'util';
import { AppError } from '../middleware/errorHandler';
import config from '../config';
import logger from './logger';

const DnsPromises = {
  lookup: promisify(dnsLookup),
};

/**
 * IP ranges that must never be contacted from outbound requests.
 * Covers RFC1918 private, loopback, link-local, and cloud metadata ranges.
 */
const BLOCKED_IP_RANGES: { start: number; end: number; label: string }[] = [
  { start: 0x00000000, end: 0x0fffffff, label: '0.0.0.0/8' },
  { start: 0x0a000000, end: 0x0affffff, label: '10.0.0.0/8' },
  { start: 0x64400000, end: 0x647fffff, label: '100.64.0.0/10' },
  { start: 0x7f000000, end: 0x7fffffff, label: '127.0.0.0/8' },
  { start: 0xa9fe0000, end: 0xa9feffff, label: '169.254.0.0/16' },
  { start: 0xac100000, end: 0xac1fffff, label: '172.16.0.0/12' },
  { start: 0xc0000000, end: 0xc00000ff, label: '192.0.0.0/24' },
  { start: 0xc0000200, end: 0xc00002ff, label: '192.0.2.0/24' },
  { start: 0xc0a80000, end: 0xc0a8ffff, label: '192.168.0.0/16' },
  { start: 0xc6120000, end: 0xc613ffff, label: '198.18.0.0/15' },
  { start: 0xc6336400, end: 0xc63364ff, label: '198.51.100.0/24' },
  { start: 0xcb007100, end: 0xcb0071ff, label: '203.0.113.0/24' },
  { start: 0xe0000000, end: 0xefffffff, label: '224.0.0.0/4' },
  { start: 0xf0000000, end: 0xffffffff, label: '240.0.0.0/4' },
];

/**
 * Convert an IPv4 string to a 32-bit integer.
 */
const ipToNumber = (ip: string): number | null => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const val = parseInt(part, 10);
    if (isNaN(val) || val < 0 || val > 255) return null;
    num = (num << 8) | val;
  }
  return num >>> 0;
};

/**
 * Check whether an IP address string falls within a blocked range.
 */
export const isBlockedIp = (ip: string): boolean => {
  const num = ipToNumber(ip);
  if (num === null) return false;
  return BLOCKED_IP_RANGES.some((range) => num >= range.start && num <= range.end);
};

/**
 * Validate an outbound webhook URL for SSRF safety.
 * Throws AppError if the URL is not safe.
 * @param url - The URL to validate
 */
export const validateWebhookUrl = async (url: string): Promise<void> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw AppError.badRequest('Invalid webhook URL');
  }

  const protocol = parsed.protocol;
  const isProduction = config.nodeEnv === 'production';

  if (isProduction && protocol !== 'https:') {
    throw AppError.badRequest('Webhook URL must use HTTPS in production');
  }
  if (!isProduction && protocol !== 'http:' && protocol !== 'https:') {
    throw AppError.badRequest('Webhook URL must use HTTP or HTTPS');
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw AppError.badRequest('Webhook URL must include a hostname');
  }

  try {
    const literal = ipToNumber(hostname);
    if (literal !== null && isBlockedIp(hostname)) {
      throw AppError.badRequest(`Webhook URL targets a blocked IP range: ${hostname}`);
    }

    const addresses = await DnsPromises.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (addr.family === 4 && isBlockedIp(addr.address)) {
        throw AppError.badRequest(`Webhook URL resolves to a blocked IP: ${addr.address}`);
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest(`Unable to resolve webhook URL host: ${hostname}`);
  }

  logger.debug('Webhook URL passed SSRF validation', { url });
};
