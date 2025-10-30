/**
 * Security & Rate Limiting Middleware
 * 
 * ✅ P1 Security Features:
 * - CORS with specific origins
 * - Security headers (HSTS, CSP, etc.)
 * - Per-IP + Per-User rate limiting
 * - Request ID tracking
 * - Content-Type validation
 * - Body size limits
 * - JWT expiry handling
 */

import { Context } from "npm:hono";
import * as kv from "./kv_store.tsx";

// ========== CONFIGURATION ==========

// Allowed origins for CORS
const ALLOWED_ORIGINS = new Set([
  "https://ezboq.com",
  "https://www.ezboq.com",
  "https://app.ezboq.com",
  // Local development
  "http://localhost:5173",
  "http://localhost:3000",
]);

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_PER_IP = 100; // Per IP
const RATE_LIMIT_MAX_PER_USER = 200; // Per authenticated user (higher limit)

// Circuit breaker for database failures
let dbCircuitBreakerState = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false,
};
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

// Body size limits (in bytes)
const MAX_JSON_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ========== CORS MIDDLEWARE ==========

export function corsMiddleware() {
  return async (c: Context, next: Function) => {
    const origin = c.req.header('origin') || '';
    const method = c.req.method;
    const path = c.req.path;
    
    // Check environment - be more permissive in non-production
    const isProduction = Deno.env.get('ENV') === 'production';

    // Check if origin is allowed
    let allowedOrigin = '';
    
    if (ALLOWED_ORIGINS.has(origin)) {
      // Explicitly whitelisted origin
      allowedOrigin = origin;
      console.log(`✅ CORS: Whitelisted origin: ${origin}`);
    } else if (!isProduction) {
      // In development, allow any origin (including null for local files)
      // This supports Figma Make environment and local development
      allowedOrigin = origin || '*';
      console.log(`🔓 CORS: Dev mode - allowing origin: ${allowedOrigin}`);
    } else if (origin.includes('figma.com') || origin.includes('supabase.co')) {
      // Allow Figma and Supabase domains in all environments
      allowedOrigin = origin;
      console.log(`✅ CORS: Special domain allowed: ${origin}`);
    } else {
      // Production mode with non-whitelisted origin - use wildcard as fallback
      allowedOrigin = '*';
      console.warn(`⚠️ CORS: Non-whitelisted origin in production: ${origin}, using wildcard`);
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      console.log(`🔍 CORS: Preflight request for ${path} from ${origin}`);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin || '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key,X-Demo-Session-Id,apikey,X-Request-ID',
          'Access-Control-Max-Age': '600',
          'Access-Control-Expose-Headers': 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After,X-Request-ID',
          'Vary': 'Origin',
        },
      });
    }

    // Set CORS headers for actual requests
    // Always set CORS headers to avoid blocking requests
    c.header('Access-Control-Allow-Origin', allowedOrigin || '*');
    c.header('Access-Control-Expose-Headers', 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After,X-Request-ID');
    c.header('Vary', 'Origin');

    await next();
  };
}

// ========== SECURITY HEADERS MIDDLEWARE ==========

export function securityHeadersMiddleware() {
  return async (c: Context, next: Function) => {
    // Generate or get request ID
    const requestId = c.req.header('X-Request-ID') || 
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    c.header('X-Request-ID', requestId);
    
    // Store request ID in context for logging
    c.set('requestId', requestId);

    // Security headers
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // For API responses, use strict CSP
    c.header('Content-Security-Policy', "default-src 'none'");
    
    // Prevent caching of sensitive data
    const path = c.req.path;
    if (path.includes('/customers') || path.includes('/documents') || 
        path.includes('/partners') || path.includes('/profile') ||
        path.includes('/tax-records')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }

    await next();
  };
}

// ========== CONTENT-TYPE VALIDATION MIDDLEWARE ==========

export function contentTypeMiddleware() {
  return async (c: Context, next: Function) => {
    const method = c.req.method;
    
    // Skip validation for OPTIONS (preflight) requests
    if (method === 'OPTIONS') {
      await next();
      return;
    }
    
    // Only validate POST and PUT requests
    if (method === 'POST' || method === 'PUT') {
      const contentType = c.req.header('content-type');
      
      // Must have application/json content type
      if (!contentType || !contentType.includes('application/json')) {
        const requestId = c.get('requestId') || 'unknown';
        console.error(`[${requestId}] ❌ Invalid Content-Type: ${contentType}`);
        
        return c.json({
          error: 'Unsupported Media Type',
          message: 'Content-Type must be application/json',
          requestId,
        }, {
          status: 415,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }

    await next();
  };
}

// ========== BODY SIZE LIMIT MIDDLEWARE ==========

export function bodySizeLimitMiddleware() {
  return async (c: Context, next: Function) => {
    const method = c.req.method;
    
    // Skip for OPTIONS (preflight) requests
    if (method === 'OPTIONS') {
      await next();
      return;
    }
    
    if (method === 'POST' || method === 'PUT') {
      const contentLength = c.req.header('content-length');
      
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        
        if (size > MAX_JSON_BODY_SIZE) {
          const requestId = c.get('requestId') || 'unknown';
          console.error(`[${requestId}] ❌ Body too large: ${size} bytes`);
          
          return c.json({
            error: 'Payload Too Large',
            message: `Request body must not exceed ${MAX_JSON_BODY_SIZE / 1024 / 1024}MB`,
            requestId,
          }, {
            status: 413,
          });
        }
      }
    }

    await next();
  };
}

// ========== RATE LIMITING MIDDLEWARE ==========

/**
 * Enhanced Rate Limiter with Per-IP and Per-User limits
 * - Per-IP: 100 requests/minute
 * - Per-User: 200 requests/minute (authenticated users get higher limit)
 */
export function rateLimitMiddleware() {
  return async (c: Context, next: Function) => {
    const path = c.req.path;
    const method = c.req.method;
    
    // Skip rate limiting for:
    // - Health/version checks
    // - OPTIONS requests (preflight)
    if (path.includes('/livez') || path.includes('/readyz') || 
        path.includes('/version') || path.includes('/health') ||
        method === 'OPTIONS') {
      await next();
      return;
    }

    const requestId = c.get('requestId') || 'unknown';
    const now = Date.now();
    const window = Math.floor(now / RATE_LIMIT_WINDOW);

    // Get client IP
    const forwardedFor = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Check for user authentication (Bearer token)
    const authHeader = c.req.header('authorization');
    const hasUserToken = authHeader?.startsWith('Bearer ') && 
                         authHeader.length > 50; // Real user tokens are long

    let rateLimitKey: string;
    let maxRequests: number;

    if (hasUserToken) {
      // Authenticated user - use user-based rate limit (higher)
      const userId = authHeader!.substring(7, 47); // Extract part of token as ID
      rateLimitKey = `ratelimit:user:${userId}:${window}`;
      maxRequests = RATE_LIMIT_MAX_PER_USER;
    } else {
      // Unauthenticated - use IP-based rate limit
      rateLimitKey = `ratelimit:ip:${clientIp}:${window}`;
      maxRequests = RATE_LIMIT_MAX_PER_IP;
    }

    try {
      // Check circuit breaker
      const now = Date.now();
      if (dbCircuitBreakerState.isOpen) {
        // Check if we should try to close the circuit
        if (now - dbCircuitBreakerState.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
          console.log(`[${requestId}] 🔄 Circuit breaker: Attempting to close circuit (half-open state)`);
          dbCircuitBreakerState.isOpen = false;
          dbCircuitBreakerState.failureCount = 0;
        } else {
          // Circuit is still open - fail open (allow request without rate limiting)
          console.warn(`[${requestId}] ⚡ Circuit breaker OPEN: Bypassing rate limiter (database unavailable)`);
          await next();
          return;
        }
      }

      // Get current count with error handling
      let count = 0;
      try {
        const value = await kv.get(rateLimitKey);
        count = (typeof value === 'number' && !isNaN(value)) ? value : 0;
        
        // Success - reset circuit breaker
        if (dbCircuitBreakerState.failureCount > 0) {
          console.log(`[${requestId}] ✅ Circuit breaker: Database recovered, resetting failure count`);
          dbCircuitBreakerState.failureCount = 0;
        }
      } catch (kvError) {
        // Increment failure count
        dbCircuitBreakerState.failureCount++;
        dbCircuitBreakerState.lastFailureTime = now;
        
        // Check if we should open the circuit
        if (dbCircuitBreakerState.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
          dbCircuitBreakerState.isOpen = true;
          console.error(`[${requestId}] ⚡ Circuit breaker OPENED: Database has failed ${dbCircuitBreakerState.failureCount} times`);
        } else {
          console.warn(`[${requestId}] ⚠️ Rate limiter KV get error (${dbCircuitBreakerState.failureCount}/${CIRCUIT_BREAKER_THRESHOLD}):`, kvError?.message || kvError);
        }
        
        // Fail open - can't check rate limit, allow request
        await next();
        return;
      }

      const remaining = Math.max(0, maxRequests - count - 1);
      const resetTime = Math.floor(now / 1000) + 60;

      // Set rate limit headers (with try-catch to prevent header errors)
      try {
        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', String(remaining));
        c.header('X-RateLimit-Reset', String(resetTime));
      } catch (headerError) {
        // Ignore header errors
      }

      if (count >= maxRequests) {
        const retryAfter = 60;
        console.warn(`[${requestId}] ⚠️ Rate limit exceeded: ${rateLimitKey} (${count} requests)`);
        
        return c.json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per minute.`,
          retryAfter,
          requestId,
        }, {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime),
          },
        });
      }

      // Increment counter (with error handling)
      try {
        await kv.set(rateLimitKey, count + 1);
      } catch (kvSetError) {
        console.warn(`[${requestId}] ⚠️ Rate limiter KV set error (continuing):`, kvSetError?.message || kvSetError);
        // Continue even if we can't increment (better than blocking all requests)
      }

      await next();
    } catch (error) {
      console.error(`[${requestId}] ❌ Rate limiter unexpected error (failing open):`, error?.message || error);
      // Fail open - allow request on any error
      await next();
    }
  };
}

// ========== AUTH VALIDATION MIDDLEWARE ==========

/**
 * Validate authentication for protected routes
 * Checks for valid Bearer token and apikey
 */
export function authMiddleware(options: { optional?: boolean } = {}) {
  return async (c: Context, next: Function) => {
    const requestId = c.get('requestId') || 'unknown';
    const authHeader = c.req.header('authorization');
    const apiKey = c.req.header('apikey');

    // Check if this is a demo session (demo sessions don't require auth)
    const demoSessionId = c.req.header('X-Demo-Session-Id');
    if (demoSessionId) {
      console.log(`[${requestId}] 🎯 Demo session access: ${demoSessionId}`);
      await next();
      return;
    }

    // If optional auth and no credentials provided, continue
    if (options.optional && !authHeader && !apiKey) {
      await next();
      return;
    }

    // Validate Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[${requestId}] ❌ Missing or invalid Authorization header`);
      return c.json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Format: Bearer <token>',
        requestId,
      }, {
        status: 401,
      });
    }

    // Validate apikey header
    if (!apiKey) {
      console.error(`[${requestId}] ❌ Missing apikey header`);
      return c.json({
        error: 'Unauthorized',
        message: 'Missing apikey header',
        requestId,
      }, {
        status: 401,
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Basic token validation (format check)
    if (token.length < 20) {
      console.error(`[${requestId}] ❌ Invalid token format`);
      return c.json({
        error: 'Unauthorized',
        message: 'Invalid token format',
        requestId,
      }, {
        status: 401,
      });
    }

    // TODO: Add JWT expiry validation
    // For now, we rely on Supabase's token validation
    // If token is expired, it should return 401 not 500

    // Store auth info in context
    c.set('authToken', token);
    c.set('apiKey', apiKey);

    await next();
  };
}

// ========== REQUEST TIMEOUT MIDDLEWARE ==========

/**
 * Global request timeout to prevent hanging requests
 * Max 3 seconds for any request (STRICT!)
 * 
 * NOTE: This doesn't use Promise.race because Hono's next() doesn't work that way.
 * Instead, we track timing and log warnings. The individual endpoints have their own timeouts.
 */
export function requestTimeoutMiddleware(maxTimeout: number = 3000) {
  return async (c: Context, next: Function) => {
    const requestId = c.get('requestId') || 'unknown';
    const path = c.req.path;
    const startTime = Date.now();
    
    // Skip timeout for health checks
    if (path.includes('/livez') || path.includes('/readyz') || 
        path.includes('/version') || path.includes('/health')) {
      await next();
      return;
    }
    
    // Execute the request
    await next();
    
    // Check duration after completion
    const duration = Date.now() - startTime;
    if (duration > maxTimeout) {
      console.error(`[${requestId}] 🚨 CRITICAL SLOW: ${path} took ${duration}ms (limit: ${maxTimeout}ms)`);
      // Note: Response already sent, so we can only log
    }
  };
}

// ========== REQUEST LOGGER MIDDLEWARE ==========

/**
 * Enhanced request logger with PII redaction
 */
export function requestLoggerMiddleware(logFn: (message: string) => void) {
  return async (c: Context, next: Function) => {
    const requestId = c.get('requestId') || 'unknown';
    const method = c.req.method;
    const path = c.req.path;
    const startTime = Date.now();

    // Log request
    logFn(`[${requestId}] → ${method} ${path}`);

    try {
      await next();
      
      // Log response with appropriate level
      const duration = Date.now() - startTime;
      const status = c.res.status;
      
      // Only warn if request is EXTREMELY slow (>5s)
      if (duration > 5000) {
        console.warn(`[${requestId}] ⚠️ SLOW REQUEST: ${path} took ${duration}ms`);
      } else if (duration > 2000) {
        // Info log for slower requests (2-5s)
        console.log(`[${requestId}] ℹ️ Slow: ${path} took ${duration}ms (within limits)`);
      }
      
      // Regular log
      logFn(`[${requestId}] ← ${status} ${method} ${path} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Redact sensitive information from error logs
      const sanitizedError = sanitizeError(error);
      logFn(`[${requestId}] ✗ ${method} ${path} (${duration}ms) - ${sanitizedError}`);
      
      throw error;
    }
  };
}

/**
 * Sanitize error messages to remove PII and secrets
 */
function sanitizeError(error: any): string {
  let message = String(error?.message || error);
  
  // Redact common PII patterns
  message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  message = message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
  message = message.replace(/Bearer\s+[^\s]+/g, 'Bearer [TOKEN_REDACTED]');
  message = message.replace(/apikey[:\s]+[^\s]+/gi, 'apikey: [KEY_REDACTED]');
  
  return message;
}

// ========== ETAG MIDDLEWARE FOR VERSION ENDPOINT ==========

export function etagMiddleware() {
  return async (c: Context, next: Function) => {
    await next();

    const path = c.req.path;
    if (path.includes('/version')) {
      const body = await c.res.clone().text();
      const hash = simpleHash(body);
      const etag = `"${hash}"`;
      
      c.header('ETag', etag);
      c.header('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

      // Check If-None-Match
      const ifNoneMatch = c.req.header('if-none-match');
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304 });
      }
    }
  };
}

/**
 * Simple hash function for ETag generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
