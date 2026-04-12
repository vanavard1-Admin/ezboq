/**
 * Log Sanitization Utilities
 * 
 * Prevents PII (Personally Identifiable Information) leakage in logs
 * - Truncates long messages
 * - Redacts sensitive patterns (phone numbers, emails, account numbers)
 * - Never logs signed URLs or full payloads
 */

/**
 * Sanitize text for logging (remove PII)
 */
export function sanitizeForLogging(text: string | undefined | null, maxLength = 50): string {
  if (!text) {
    return '';
  }
  
  let sanitized = String(text);
  
  // Truncate long messages
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  // Redact phone numbers (Thai format: 0XX-XXX-XXXX or 0XXXXXXXXX)
  sanitized = sanitized.replace(/\b0\d{1,2}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE_REDACTED]');
  
  // Redact email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // Redact long digit sequences (likely account numbers, IDs)
  sanitized = sanitized.replace(/\b\d{10,}\b/g, '[NUMBER_REDACTED]');
  
  // Redact potential bank account numbers (Thai format: XXX-X-XXXXX-X)
  sanitized = sanitized.replace(/\b\d{3}[-.\s]?\d{1}[-.\s]?\d{5}[-.\s]?\d{1}\b/g, '[ACCOUNT_REDACTED]');
  
  // Redact potential credit card numbers (16 digits with optional spaces/dashes)
  sanitized = sanitized.replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, '[CARD_REDACTED]');
  
  return sanitized;
}

/**
 * Sanitize URL for logging (remove signed URL tokens)
 */
export function sanitizeUrlForLogging(url: string | undefined | null): string {
  if (!url) {
    return '';
  }
  
  try {
    const urlObj = new URL(url);
    
    // Check if it's a signed URL (has query params like X-Goog-Signature, etc.)
    if (urlObj.searchParams.has('X-Goog-Signature') || 
        urlObj.searchParams.has('X-Goog-Algorithm') ||
        urlObj.searchParams.has('Signature') ||
        urlObj.searchParams.has('Expires')) {
      // Return path only, redact query params
      return `${urlObj.origin}${urlObj.pathname}?[SIGNED_URL_REDACTED]`;
    }
    
    // For other URLs, truncate if too long
    if (url.length > 100) {
      return url.substring(0, 100) + '...';
    }
    
    return url;
  } catch {
    // Invalid URL, return truncated
    if (url.length > 100) {
      return url.substring(0, 100) + '...';
    }
    return url;
  }
}

/**
 * Sanitize object for logging (remove sensitive fields)
 */
export function sanitizeObjectForLogging(obj: unknown, maxDepth = 3, currentDepth = 0): unknown {
  if (currentDepth >= maxDepth) {
    return '[MAX_DEPTH_REACHED]';
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeForLogging(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 10).map(item => sanitizeObjectForLogging(item, maxDepth, currentDepth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'creditCard', 'cardNumber', 'cvv', 'ssn', 'accountNumber',
      'phone', 'email', 'address', 'signature', 'signedUrl', 'url',
      'messageText', 'text', 'body', 'payload', 'data'
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Skip sensitive fields
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObjectForLogging(value, maxDepth, currentDepth + 1);
    }
    
    return sanitized;
  }
  
  return '[UNKNOWN_TYPE]';
}

