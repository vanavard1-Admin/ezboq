/**
 * Production-Safe Logger Utility
 * 
 * ✅ Auto-redacts sensitive data (JWT, tokens, emails, phone numbers)
 * ✅ Suppresses noisy logs in production
 * ✅ Always logs errors for debugging
 */

import { isProd } from './isProd';

/**
 * Redact sensitive information from log messages
 */
const redact = (msg: string): string => {
  return msg
    // Redact JWT tokens (three-part base64 strings)
    .replace(/\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g, '***JWT***')
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9-_\.]+/gi, 'Bearer ***TOKEN***')
    // Redact email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '***EMAIL***')
    // Redact Thai phone numbers (+66 or 0 followed by 8-10 digits)
    .replace(/\b(?:\+?66|0)\d{8,10}\b/g, '***PHONE***')
    // Redact Authorization header values
    .replace(/Authorization:\s*[^\s,]+/gi, 'Authorization: ***REDACTED***')
    // Redact X-User-Id header values
    .replace(/X-User-Id:\s*[^\s,]+/gi, 'X-User-Id: ***REDACTED***')
    // Redact token in URLs
    .replace(/[?&]token=[^&\s]+/gi, '?token=***REDACTED***')
    // Redact UUIDs (user IDs)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '***UUID***')
    // Redact "Client got token" messages
    .replace(/Client got token/gi, 'Client got ***TOKEN***');
};

/**
 * Clean arguments by redacting sensitive strings
 */
function cleanArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return redact(arg);
    }
    // For objects, stringify and redact, then parse back
    if (arg && typeof arg === 'object') {
      try {
        const stringified = JSON.stringify(arg);
        const redacted = redact(stringified);
        return JSON.parse(redacted);
      } catch {
        return arg; // Return as-is if JSON operations fail
      }
    }
    return arg;
  });
}

/**
 * Production-safe logger
 * - info/debug/warn: Only in development
 * - error: Always logged (with redaction)
 */
export const log = {
  /**
   * Debug logs - development only
   */
  debug: (...args: any[]) => {
    if (!isProd()) {
      console.debug(...cleanArgs(args));
    }
  },

  /**
   * Info logs - development only
   */
  info: (...args: any[]) => {
    if (!isProd()) {
      console.info(...cleanArgs(args));
    }
  },

  /**
   * Warning logs - development only
   */
  warn: (...args: any[]) => {
    if (!isProd()) {
      console.warn(...cleanArgs(args));
    }
  },

  /**
   * Error logs - always logged (even in production)
   * Sensitive data is automatically redacted
   */
  error: (...args: any[]) => {
    console.error(...cleanArgs(args));
  },
};

/**
 * Utility to safely log token length without exposing the token
 */
export const logTokenInfo = (token: string | null | undefined, context: string = 'token') => {
  if (!isProd()) {
    console.debug(`${context}: ${token ? `present (${token.length} chars)` : 'missing'}`);
  }
};

/**
 * Check if running in production
 */
export const isProduction = () => isProd();