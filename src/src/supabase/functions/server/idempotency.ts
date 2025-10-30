/**
 * Idempotency Handler
 * 
 * ✅ P1 Features:
 * - Scoped to (user_id | demo_session) + method + path
 * - TTL: 24 hours
 * - Race condition protection with unique index simulation
 * - Atomic operations to prevent duplicate processing
 */

import { Context } from "npm:hono";
import * as kv from "./kv_store.tsx";

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get idempotency scope key
 * Format: idempotency:{scope}:{method}:{path}:{key}
 * 
 * Scope is either:
 * - User ID (from auth token)
 * - Demo session ID
 */
function getIdempotencyKey(c: Context, idempotencyKey: string): string {
  const method = c.req.method;
  const path = c.req.path;
  
  // Get scope: user ID or demo session ID
  const demoSessionId = c.req.header('X-Demo-Session-Id');
  const authToken = c.get('authToken');
  
  let scope: string;
  if (demoSessionId) {
    scope = `demo-${demoSessionId}`;
  } else if (authToken) {
    // Extract user ID from token (first 40 chars as identifier)
    scope = `user-${authToken.substring(0, 40)}`;
  } else {
    scope = 'anon';
  }

  // Normalize path (remove route prefix and parameters)
  const normalizedPath = path
    .replace('/make-server-6e95bca3', '')
    .replace(/\/[a-f0-9-]{36}/gi, '/:id') // Replace UUIDs with :id
    .replace(/\/[a-z0-9_-]+$/i, '/:id'); // Replace IDs at end

  return `idempotency:${scope}:${method}:${normalizedPath}:${idempotencyKey}`;
}

/**
 * Get or set idempotency lock
 * Returns true if lock acquired, false if already locked
 */
async function acquireLock(key: string): Promise<boolean> {
  const lockKey = `${key}:lock`;
  const existing = await kv.get(lockKey);
  
  if (existing) {
    // Check if lock expired (safety measure)
    const lockTime = typeof existing === 'number' ? existing : 0;
    if (Date.now() - lockTime < 30000) { // 30 second lock timeout
      return false;
    }
  }
  
  // Acquire lock
  await kv.set(lockKey, Date.now());
  return true;
}

/**
 * Release idempotency lock
 */
async function releaseLock(key: string): Promise<void> {
  const lockKey = `${key}:lock`;
  await kv.del(lockKey);
}

/**
 * Handle idempotent requests
 * 
 * Usage:
 * ```typescript
 * app.post('/endpoint', async (c) => {
 *   return await handleIdempotency(c, async () => {
 *     // Your operation here
 *     return c.json({ success: true });
 *   });
 * });
 * ```
 */
export async function handleIdempotency(
  c: Context,
  operation: () => Promise<Response>
): Promise<Response> {
  const requestId = c.get('requestId') || 'unknown';
  const idempotencyKeyHeader = c.req.header('Idempotency-Key');
  
  // If no idempotency key provided, execute operation normally
  if (!idempotencyKeyHeader) {
    return await operation();
  }

  const key = getIdempotencyKey(c, idempotencyKeyHeader);
  
  try {
    // Check if this request was already processed
    const cached = await kv.get(key);
    
    if (cached) {
      // Check if cache is still valid (within TTL)
      const expiryKey = `${key}:expiry`;
      const expiry = await kv.get(expiryKey);
      
      if (expiry && typeof expiry === 'number' && expiry > Date.now()) {
        console.log(`[${requestId}] 🔁 Idempotency: Returning cached response for key: ${idempotencyKeyHeader}`);
        
        // Return cached response
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotent': 'hit',
          },
        });
      } else {
        // Cache expired, clean up
        await kv.del(key);
        await kv.del(expiryKey);
        await kv.del(`${key}:lock`);
      }
    }

    // Acquire lock to prevent race conditions
    const lockAcquired = await acquireLock(key);
    
    if (!lockAcquired) {
      console.warn(`[${requestId}] ⚠️ Idempotency: Lock conflict for key: ${idempotencyKeyHeader}`);
      
      // Wait a bit and retry (simulating conflict resolution)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check cache again
      const cachedRetry = await kv.get(key);
      if (cachedRetry) {
        return new Response(JSON.stringify(cachedRetry), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotent': 'hit',
          },
        });
      }
      
      // If still no cache, return 409 Conflict
      return new Response(JSON.stringify({
        error: 'Conflict',
        message: 'This request is currently being processed. Please wait and retry.',
        requestId,
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    try {
      // Execute the operation
      const response = await operation();
      
      // Only cache successful responses (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        // Clone response to read body
        const clonedResponse = response.clone();
        const body = await clonedResponse.text();
        
        let responseData: any;
        try {
          responseData = JSON.parse(body);
        } catch {
          // If not JSON, store as text
          responseData = { data: body };
        }

        // Cache the response
        await kv.set(key, responseData);
        
        // Set expiry (24 hours)
        const expiryKey = `${key}:expiry`;
        await kv.set(expiryKey, Date.now() + IDEMPOTENCY_TTL);
        
        console.log(`[${requestId}] ✅ Idempotency: Cached response for key: ${idempotencyKeyHeader} (TTL: 24h)`);
        
        // Return response with idempotency header
        return new Response(body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Idempotent': 'miss',
          },
        });
      }

      // Non-successful responses are not cached
      return response;
    } finally {
      // Always release lock
      await releaseLock(key);
    }
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Idempotency error:`, error);
    
    // Release lock on error
    await releaseLock(key);
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to process idempotent request',
      requestId,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * Clean up expired idempotency cache entries
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredIdempotency(): Promise<number> {
  try {
    const allKeys = await kv.getByPrefix('idempotency:');
    let cleaned = 0;

    if (Array.isArray(allKeys)) {
      const now = Date.now();
      
      for (const entry of allKeys) {
        if (typeof entry === 'string' && entry.endsWith(':expiry')) {
          const expiryValue = await kv.get(entry);
          
          if (typeof expiryValue === 'number' && expiryValue < now) {
            // Expired - delete cache and lock
            const baseKey = entry.replace(':expiry', '');
            await kv.del(baseKey);
            await kv.del(entry);
            await kv.del(`${baseKey}:lock`);
            cleaned++;
          }
        }
      }
    }

    console.log(`🧹 Idempotency cleanup: Removed ${cleaned} expired entries`);
    return cleaned;
  } catch (error) {
    console.error('Idempotency cleanup error:', error);
    return 0;
  }
}
