/**
 * Secure Console Wrapper (Security Fix for Logging)
 * 
 * Wraps console.log/warn/error with security measures:
 * - Automatically hashes lineUserId
 * - Redacts sensitive data
 * - Truncates long text
 * - Uses safeJsonStringify for objects
 * - ✅ FIX 6: Prevents full object dumps (logs keys + counts instead)
 * 
 * Usage:
 *   import { secureLog, secureWarn, secureError } from './utils/secureConsole';
 *   secureLog({ trace_id: '...', line_user_id: 'U123...', message: '...' });
 */

import { prepareSecureLog } from './logSecurity';
import { safeJsonStringify } from './safeJsonStringify';

/**
 * Secure log (replaces console.log)
 * Automatically applies security measures to log data
 */
export function secureLog(data: Record<string, unknown>): void {
  const secure = prepareSecureLog(data);
  console.log(safeJsonStringify(secure));
}

/**
 * Secure warn (replaces console.warn)
 */
export function secureWarn(data: Record<string, unknown>): void {
  const secure = prepareSecureLog(data);
  console.warn(safeJsonStringify(secure));
}

/**
 * Secure error (replaces console.error)
 * Handles Error objects specially
 */
export function secureError(data: Record<string, unknown>, error?: Error | unknown): void {
  const secure = prepareSecureLog(data);
  
  if (error) {
    if (error instanceof Error) {
      secure.error_message = error.message;
      secure.error_code = (error as any).code;
      secure.error_stack = error.stack ? error.stack.substring(0, 500) : undefined; // Truncate stack
    } else {
      secure.error = String(error).substring(0, 200); // Truncate
    }
  }
  
  console.error(safeJsonStringify(secure));
}

