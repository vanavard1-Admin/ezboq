/**
 * Safe JSON Stringify (Issue #6: Fix encoding issues in logs)
 * 
 * Handles objects that JSON.stringify cannot serialize:
 * - Buffer → base64 string or [buffer] marker
 * - BigInt → string representation
 * - Firestore Timestamp → ISO string
 * - Circular references → [Circular]
 * 
 * Usage:
 *   import { safeJsonStringify } from './utils/safeJsonStringify';
 *   const safe = safeJsonStringify(obj);
 */

import * as admin from 'firebase-admin';

/**
 * Safe JSON stringify that handles Buffer, BigInt, Timestamp, and circular references
 */
export function safeJsonStringify(obj: unknown, space?: number): string {
  const seen = new WeakSet();

  function replacer(key: string, value: unknown): unknown {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle Buffer
    if (Buffer.isBuffer(value)) {
      return `[Buffer:${value.length}bytes]`; // Don't include actual data
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Handle Firestore Timestamp
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as any).toMillis === 'function') {
      try {
        const timestamp = value as admin.firestore.Timestamp;
        return timestamp.toDate().toISOString();
      } catch {
        return '[Timestamp]';
      }
    }

    // Handle Date
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    return value;
  }

  try {
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    // Fallback: return error message
    return `[JSON.stringify error: ${error instanceof Error ? error.message : String(error)}]`;
  }
}
