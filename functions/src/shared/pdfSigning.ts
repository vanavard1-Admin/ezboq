import * as admin from 'firebase-admin';
import { getDefaultSignedUrlExpireDays } from './config';

/**
 * Single source of truth for PDF signed-URL policy.
 *
 * Option B: `pdf_path` is the source of truth. Signed URLs are generated on demand
 * and may be cached/stored only as best-effort hints.
 */
export const getSignedUrlDays = (): number => {
  const raw =
    process.env.SIGNED_URL_DAYS ||
    String(getDefaultSignedUrlExpireDays());
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 7;
};

export type SignPdfPathOptions = {
  days?: number;
  responseDisposition?: string;
  responseType?: string;
  // Keep compat with existing worker that used v4 signing
  version?: 'v2' | 'v4';
};

/**
 * Generate a fresh signed URL for a Storage object path (e.g. `pdf_path`).
 * Caller must ensure Firebase Admin is initialized in their module.
 */
export async function signPdfPath(
  pdfPath: string,
  opts: SignPdfPathOptions = {}
): Promise<string> {
  const days = opts.days ?? getSignedUrlDays();
  const expiresMs = Date.now() + days * 24 * 60 * 60 * 1000;

  const bucket = admin.storage().bucket();
  const file = bucket.file(pdfPath);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: expiresMs,
    ...(opts.version ? { version: opts.version } : {}),
    ...(opts.responseDisposition ? { responseDisposition: opts.responseDisposition } : {}),
    ...(opts.responseType ? { responseType: opts.responseType } : {}),
  });

  return url;
}

