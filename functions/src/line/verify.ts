/**
 * LINE Signature Verification
 * HMAC-SHA256 signature validation for webhook requests (Buffer-safe)
 */

import crypto from 'crypto';

/**
 * Verify LINE webhook signature
 * LINE signs the raw request body bytes with HMAC-SHA256 and encodes as base64.
 *
 * @param rawBody - Raw request body as Buffer (exact bytes received)
 * @param channelSecret - LINE channel secret
 * @param signature - x-line-signature header value (base64)
 * @returns true if signature is valid
 */
export function verifyLineSignature(
  rawBody: Buffer | string,
  channelSecret: string,
  signature?: string
): boolean {
  if (!signature) return false;

  // Normalize rawBody to Buffer
  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody), 'utf8');

  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(bodyBuffer)
    .digest(); // Buffer

  const received = Buffer.from(signature, 'base64');

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
