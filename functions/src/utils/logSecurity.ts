/**
 * Logging Security Utilities (Issue #5, Security Fix)
 * 
 * Safe logging helpers:
 * - Hash lineUserId before logging
 * - Redact sensitive patterns (tax ID, account numbers, etc.)
 * - Truncate long text
 * - Use safeJsonStringify for complex objects
 * - ✅ FIX 6: Prevents full object dumps (logs keys + counts instead)
 */

import * as crypto from 'crypto';

/**
 * ✅ FIX 6: Safe object logging - prevents full object dumps
 * Logs object structure (keys, counts) instead of full content
 */
function safeObjectLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return {
      _type: 'array',
      length: obj.length,
      first_item_keys: obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null
        ? Object.keys(obj[0])
        : undefined,
    };
  }
  
  // Object - log keys and types, not values
  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {
    _type: 'object',
    _keys: keys,
    _key_count: keys.length,
  };
  
  // Log types for each key (not values)
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value === null || value === undefined) {
      result[`${key}_type`] = value === null ? 'null' : 'undefined';
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        result[`${key}_type`] = 'array';
        result[`${key}_length`] = value.length;
      } else {
        result[`${key}_type`] = 'object';
        result[`${key}_keys`] = Object.keys(value);
      }
    } else {
      result[`${key}_type`] = typeof value;
      // Only log primitive values (not objects/arrays)
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        // Truncate strings
        if (typeof value === 'string' && value.length > 100) {
          result[`${key}_value`] = value.substring(0, 100) + '...';
        } else {
          result[`${key}_value`] = value;
        }
      }
    }
  }
  
  return result;
}

/**
 * Hash LINE user ID for privacy in logs
 */
export function hashLineUserId(lineUserId: string): string {
  const hash = crypto.createHash('sha256').update(lineUserId).digest('hex');
  return hash.substring(0, 16); // First 16 chars for readability
}

/**
 * Redact sensitive patterns from text
 * Patterns to redact:
 * - Tax ID: 13 digits (Thai tax ID)
 * - Account numbers: 10-15 digits
 * - Credit card patterns: 13-19 digits (but less likely in Thai context)
 */
export function redactSensitiveData(text: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact Thai tax ID (13 digits, may have dashes)
  redacted = redacted.replace(/\b\d{1,3}-?\d{4}-?\d{5}-?\d{2}-?\d{1}\b/g, '[TAX_ID_REDACTED]');

  // Redact potential account numbers (10-15 consecutive digits)
  redacted = redacted.replace(/\b\d{10,15}\b/g, '[ACCOUNT_REDACTED]');

  // Redact phone numbers (Thai format: 08x-xxx-xxxx or +66...)
  redacted = redacted.replace(/(\+66|0)\d{1,2}[- ]?\d{3}[- ]?\d{4}/g, '[PHONE_REDACTED]');

  return redacted;
}

/**
 * Truncate text to safe length for logging
 * Returns truncated text with "...[truncated]" suffix if needed
 */
export function truncateForLog(text: string, maxLength: number = 120): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...[truncated]';
}

/**
 * Safe log text: redact + truncate
 */
export function safeLogText(text: string, maxLength: number = 120): string {
  const redacted = redactSensitiveData(text);
  return truncateForLog(redacted, maxLength);
}

/**
 * Prepare log object with security measures
 * - Hashes lineUserId if present
 * - Redacts and truncates text fields
 * - Uses safeJsonStringify for complex objects
 */
export function prepareSecureLog(obj: Record<string, unknown>): Record<string, unknown> {
  const secure: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Hash lineUserId fields
    if ((key === 'line_user_id' || key === 'lineUserId') && typeof value === 'string') {
      secure[key] = hashLineUserId(value);
      continue;
    }

    // Hash user_id if it's a LINE user ID format (starts with U)
    if (key === 'user_id' && typeof value === 'string' && value.startsWith('U')) {
      secure[key] = hashLineUserId(value);
      continue;
    }

    // Redact and truncate text fields
    if ((key === 'original_text' || key === 'messageText' || key === 'text' || key.includes('message')) 
        && typeof value === 'string') {
      secure[key] = safeLogText(value, 120);
      continue;
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > 200) {
      secure[key] = truncateForLog(value, 200);
      continue;
    }

    // ✅ FIX 6: For objects, use safe object logging (keys + types, not full content)
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      secure[key] = safeObjectLog(value);
      continue;
    }

    // Pass through other values
    secure[key] = value;
  }

  return secure;
}

