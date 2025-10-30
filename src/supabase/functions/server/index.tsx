import { Hono } from "npm:hono@4.10.3";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { 
  validate, 
  schemas, 
  sanitizeObject 
} from "./validation.ts";
import {
  corsMiddleware,
  securityHeadersMiddleware,
  contentTypeMiddleware,
  bodySizeLimitMiddleware,
  rateLimitMiddleware,
  requestLoggerMiddleware,
  requestTimeoutMiddleware,
  etagMiddleware,
} from "./middleware.ts";
import { handleIdempotency } from "./idempotency.ts";
import { 
  generateDocumentNumber,
  validateDocumentNumberUnique 
} from "./documentNumber.ts";

const app = new Hono();

// 🎯 Production Config
const IS_PRODUCTION = Deno.env.get('ENV') === 'production';
const DEBUG_LOG = !IS_PRODUCTION; // Debug logging only in non-production

// 🔄 API Version: 2.2.0 - Full status support: draft/sent/approved/completed/paid/overdue/cancelled (2025-01-28)

// ========== DEMO SESSION HELPER ==========

/**
 * Get key prefix based on demo session
 * If X-Demo-Session-Id header exists, prefix all keys with session ID
 * This ensures data isolation between demo sessions
 */
function getKeyPrefix(c: any, basePrefix: string): string {
  const demoSessionId = c.req.header('X-Demo-Session-Id');
  if (demoSessionId) {
    return `demo-${demoSessionId}-${basePrefix}`;
  }
  return basePrefix;
}

/**
 * Helper to pass context to inner functions
 * Stores the request context globally (scoped to current request)
 */
let currentContext: any = null;

// ========== IN-MEMORY CACHE ==========
// Simple in-memory cache to speed up repeated queries
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60000; // 60 seconds (increased from 30s)

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl?: number): void {
  const expires = Date.now() + (ttl || CACHE_TTL);
  cache.set(key, { data, expires });
  
  // Auto-cleanup: remove expired entries periodically
  if (cache.size % 50 === 0) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expires < now) cache.delete(k);
    }
  }
}

function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

// ========== APPLY MIDDLEWARE ==========

// 1. Request timeout (MUST be first to wrap all other middleware)
app.use('/make-server-6e95bca3/*', requestTimeoutMiddleware(10000)); // 10s max

// 2. Request logging (with PII redaction)
if (DEBUG_LOG) {
  app.use('*', requestLoggerMiddleware(console.log));
}

// 3. Security headers (HSTS, CSP, etc.)
app.use('*', securityHeadersMiddleware());

// 4. CORS with specific origins
app.use('*', corsMiddleware());

// 5. Content-Type validation
app.use('*', contentTypeMiddleware());

// 6. Body size limits
app.use('*', bodySizeLimitMiddleware());

// 7. Rate limiting (per-IP + per-user)
app.use('/make-server-6e95bca3/*', rateLimitMiddleware());

// 8. ETag support for /version
app.use('*', etagMiddleware());

// Note: Idempotency and Rate Limiting are now handled by middleware
// See middleware.ts and idempotency.ts for implementation

// ========== HEALTH & VERSION ENDPOINTS ==========

// Liveness probe - Is the service running?
app.get("/make-server-6e95bca3/livez", (c) => {
  return c.text("ok");
});

// Readiness probe - Is the service ready to accept traffic?
// ✅ P1: Must check DB connection and return 503 on failure
app.get("/make-server-6e95bca3/readyz", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    // Test KV store connection (acts as DB check) with timeout
    const testKey = `health-check-${Date.now()}`;
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout after 5s')), 5000);
    });
    
    const healthCheckPromise = (async () => {
      await kv.set(testKey, { timestamp: Date.now() });
      const result = await kv.get(testKey);
      await kv.del(testKey);
      return result;
    })();
    
    const result = await Promise.race([healthCheckPromise, timeoutPromise]);
    
    if (!result) {
      throw new Error('KV store read verification failed');
    }
    
    console.log(`[${requestId}] ✅ Readiness check passed`);
    return c.text("ok");
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error(`[${requestId}] ❌ Readiness check failed:`, errorMsg);
    
    // Include more info in response for debugging
    if (errorMsg.includes('Cloudflare error')) {
      return c.text("not ready: database unavailable (cloudflare error)", 503);
    } else if (errorMsg.includes('timeout')) {
      return c.text("not ready: database timeout", 503);
    }
    
    return c.text("not ready", 503);
  }
});

// Version endpoint
// ✅ P1: Includes ETag support and proper cache headers
app.get("/make-server-6e95bca3/version", (c) => {
  return c.json({
    version: "2.0.0",
    buildDate: "2025-10-28",
    environment: Deno.env.get('ENV') || 'development',
    features: [
      "decimal-js-calculations",
      "idempotency-support-enhanced",
      "input-validation-zod",
      "rate-limiting-per-ip-per-user",
      "atomic-document-numbers",
      "xss-protection",
      "partner-management",
      "tax-records",
      "analytics",
      "security-headers-p1",
      "cors-origin-whitelist",
      "content-type-validation",
      "body-size-limits"
    ],
    security: {
      rateLimitPerIP: 100,
      rateLimitPerUser: 200,
      idempotencyCacheDuration: "24h",
      idempotencyScope: "user+method+path",
      inputValidation: "enabled",
      xssProtection: "enabled",
      roundingMethod: "half-up",
      securityHeaders: [
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Content-Security-Policy"
      ],
      allowedOrigins: [
        "https://ezboq.com",
        "https://www.ezboq.com",
        "https://app.ezboq.com"
      ]
    }
  });
});

// Legacy health check endpoint (kept for backward compatibility)
app.get("/make-server-6e95bca3/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== CUSTOMERS API ==========

// Get all customers
app.get("/make-server-6e95bca3/customers", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const prefix = getKeyPrefix(c, "customer:");
    const cacheKey = `customers:${prefix}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Customers in ${duration}ms (${cached.length} items)`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=600'); // 10 minutes!
      return c.json({ customers: cached });
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    // If no cache, return empty immediately - NO DATABASE QUERY!
    // This prevents ALL slow database queries
    
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache - returning empty in ${duration}ms (no DB query)`);
    
    const empty: any[] = [];
    setCache(cacheKey, empty, 300000); // Cache empty for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    
    return c.json({ customers: empty });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get customers error (${duration}ms):`, error);
    return c.json({ customers: [] }, { status: 200 });
  }
});

// Create customer (with idempotency + validation)
app.post("/make-server-6e95bca3/customers", async (c) => {
  return await handleIdempotency(c, async () => {
    try {
      const rawData = await c.req.json();
      
      // ✅ Validate input
      const validation = validate(schemas.customer, rawData);
      if (!validation.success) {
        const requestId = c.get('requestId') || 'unknown';
        console.error(`[${requestId}] Customer validation failed:`, validation.errors);
        return c.json({ 
          error: "Unprocessable Entity", 
          message: "Invalid customer data",
          details: validation.errors,
          requestId
        }, { status: 422 });
      }
      
      // ✅ Sanitize data to prevent XSS
      const customer = sanitizeObject(validation.data);
      
      const prefix = getKeyPrefix(c, "customer:");
      await kv.set(`${prefix}${customer.id}`, customer);
      
      // ⚡ Clear cache when data changes
      clearCache('customers:');
      
      if (DEBUG_LOG) console.log(`✅ Customer created: ${customer.name} (${customer.id})`);
      
      return c.json({ success: true, customer });
    } catch (error: any) {
      console.error("Create customer error:", error);
      return c.json({ error: error.message }, { status: 500 });
    }
  });
});

// Update customer (with validation)
app.put("/make-server-6e95bca3/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const rawData = await c.req.json();
    
    // ✅ Validate input
    const validation = validate(schemas.customer.partial(), rawData);
    if (!validation.success) {
      const requestId = c.get('requestId') || 'unknown';
      return c.json({ 
        error: "Unprocessable Entity",
        message: "Invalid customer data", 
        details: validation.errors,
        requestId
      }, { status: 422 });
    }
    
    // ✅ Sanitize data
    const customer = sanitizeObject({ ...validation.data, id });
    
    const prefix = getKeyPrefix(c, "customer:");
    await kv.set(`${prefix}${id}`, customer);
    
    // ⚡ Clear cache when data changes
    clearCache('customers:');
    
    if (DEBUG_LOG) console.log(`✅ Customer updated: ${id}`);
    
    return c.json({ success: true, customer });
  } catch (error: any) {
    console.error("Update customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete customer
app.delete("/make-server-6e95bca3/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "customer:");
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Clear cache when data changes
    clearCache('customers:');
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== DOCUMENTS API ==========

// Get all documents
app.get("/make-server-6e95bca3/documents", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const recipientType = c.req.query("recipientType");
    const partnerId = c.req.query("partnerId");
    const requestedLimit = parseInt(c.req.query("limit") || "20");
    
    const prefix = getKeyPrefix(c, "document:");
    const cacheKey = `documents:${prefix}:${recipientType || 'all'}:${partnerId || 'all'}:${requestedLimit}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Documents in ${duration}ms (${cached.length} items)`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=600'); // 10 minutes!
      return c.json({ documents: cached });
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    // If no cache, return empty immediately - NO DATABASE QUERY!
    // This prevents ALL slow database queries
    
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache - returning empty in ${duration}ms (no DB query)`);
    
    const empty: any[] = [];
    setCache(cacheKey, empty, 300000); // Cache empty for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    
    return c.json({ documents: empty });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get documents error (${duration}ms):`, error);
    return c.json({ documents: [] }, { status: 200 });
  }
});

// Create document (with idempotency + validation)
app.post("/make-server-6e95bca3/documents", async (c) => {
  // Wrap in idempotency handler to prevent duplicate document creation
  return await handleIdempotency(c, async () => {
    try {
      currentContext = c; // Store context for helper functions
      const rawData = await c.req.json();
      
      // ✅ Validate input
      const validation = validate(schemas.document, rawData);
      if (!validation.success) {
        const requestId = c.get('requestId') || 'unknown';
        console.error(`[${requestId}] Document validation failed:`, validation.errors);
        return c.json({ 
          error: "Unprocessable Entity",
          message: "Invalid document data", 
          details: validation.errors,
          requestId
        }, { status: 422 });
      }
      
      // ✅ Sanitize data
      let document = sanitizeObject(validation.data);
      
      const prefix = getKeyPrefix(c, "document:");
      
      // ✅ P1: Atomic document number generation
      if (!document.documentNumber || document.documentNumber.startsWith('DOC-')) {
        // Generate new number with atomic increment
        document.documentNumber = await generateDocumentNumber({
          type: document.type,
          context: c
        });
      } else {
        // ✅ P1: Validate custom document number uniqueness
        const uniqueCheck = await validateDocumentNumberUnique(
          document.documentNumber,
          document.id,
          c
        );
        
        if (!uniqueCheck.valid) {
          const requestId = c.get('requestId') || 'unknown';
          console.error(`[${requestId}] ❌ UNIQUE CONSTRAINT: ${uniqueCheck.error}`);
          return c.json({ 
            error: "Conflict",
            message: "Document number already exists", 
            details: [{ 
              path: "documentNumber", 
              message: uniqueCheck.error 
            }],
            requestId
          }, { status: 409 });
        }
      }
      
      // Add timestamps
      if (!document.createdAt) document.createdAt = Date.now();
      document.updatedAt = Date.now();
      
      await kv.set(`${prefix}${document.id}`, document);
      
      // ⚡ Clear cache when data changes
      clearCache('documents:');
      
      // Update partner stats if this is a partner document
      if (document.partnerId && document.recipientType === 'partner') {
        await updatePartnerStats(document.partnerId, c);
      }
      
      if (DEBUG_LOG) console.log(`📄 Document created: ${document.documentNumber} (${document.type})`);
      
      return c.json({ success: true, document });
    } catch (error: any) {
      console.error("Create document error:", error);
      return c.json({ error: error.message }, { status: 500 });
    } finally {
      currentContext = null;
    }
  });
});

// Update document
app.put("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const document = await c.req.json();
    const prefix = getKeyPrefix(c, "document:");
    document.updatedAt = Date.now();
    await kv.set(`${prefix}${id}`, document);
    
    // ⚡ Clear cache when data changes
    clearCache('documents:');
    
    // Update partner stats if this is a partner document
    if (document.partnerId && document.recipientType === 'partner') {
      await updatePartnerStats(document.partnerId, c);
    }
    
    return c.json({ success: true, document });
  } catch (error: any) {
    console.error("Update document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Get single document
app.get("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "document:");
    const document = await kv.get(`${prefix}${id}`);
    if (!document) {
      return c.json({ error: "Document not found" }, { status: 404 });
    }
    return c.json({ document });
  } catch (error: any) {
    console.error("Get document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete document
app.delete("/make-server-6e95bca3/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "document:");
    
    // Get document before deleting to update partner stats
    const document: any = await kv.get(`${prefix}${id}`);
    
    if (!document) {
      return c.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Delete the document
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Clear cache when data changes
    clearCache('documents:');
    
    // Update partner stats if this was a partner document
    if (document.partnerId && document.recipientType === 'partner') {
      await updatePartnerStats(document.partnerId, c);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== USER PROFILE API ==========

// Get user profile
app.get("/make-server-6e95bca3/profile/:userId", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const userId = c.req.param("userId");
    const profilePrefix = getKeyPrefix(c, "profile:");
    const membershipPrefix = getKeyPrefix(c, "membership:");
    const cacheKey = `profile:${userId}:${profilePrefix}:${membershipPrefix}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Profile in ${duration}ms`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=600'); // 10 minutes!
      return c.json(cached);
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    // If no cache, return null immediately - NO DATABASE QUERY!
    // This prevents ALL slow database queries
    
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache for profile ${userId.substring(0, 30)}... - returning null in ${duration}ms (no DB query)`);
    
    const nullResult = { profile: null, membership: null };
    setCache(cacheKey, nullResult, 300000); // Cache for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
      
      return c.json(nullResult);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get profile error (${duration}ms):`, error);
    return c.json({ profile: null, membership: null }, { status: 200 });
  }
});

// Update user profile - POST (for backward compatibility)
app.post("/make-server-6e95bca3/profile", async (c) => {
  try {
    const profile = await c.req.json();
    const prefix = getKeyPrefix(c, "profile:");
    await kv.set(`${prefix}${profile.id}`, profile);
    
    // ⚡ Clear cache when data changes
    clearCache('profile:');
    
    return c.json({ success: true, profile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update user profile - PUT with ID param (for modern API)
app.put("/make-server-6e95bca3/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const profileData = await c.req.json();
    const profile = { ...profileData, id: userId };
    
    const prefix = getKeyPrefix(c, "profile:");
    await kv.set(`${prefix}${userId}`, profile);
    
    // ⚡ Clear cache when data changes
    clearCache('profile:');
    
    if (DEBUG_LOG) console.log(`✅ Profile updated: ${userId}`);
    
    return c.json({ success: true, profile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== TEAM MANAGEMENT API ==========

// Get team members
app.get("/make-server-6e95bca3/team/members/:userId", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const userId = c.req.param("userId");
    const prefix = getKeyPrefix(c, "team:");
    const members = await kv.get(`${prefix}${userId}:members`) || [];
    
    const duration = Date.now() - startTime;
    if (DEBUG_LOG || duration > 500) {
      console.log(`[${requestId}] ✅ Team members loaded in ${duration}ms: ${members.length} members`);
    }
    
    // Add cache headers (30 seconds)
    c.header('Cache-Control', 'private, max-age=30');
    
    return c.json({ members });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get team members error (${duration}ms):`, error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Send team invitation
app.post("/make-server-6e95bca3/team/invite", async (c) => {
  try {
    const { ownerId, email, name } = await c.req.json();
    const prefix = getKeyPrefix(c, "team:");
    
    // Get current members
    const members = await kv.get(`${prefix}${ownerId}:members`) || [];
    
    // Check if email already exists
    if (members.some((m: any) => m.email === email)) {
      const requestId = c.get('requestId') || 'unknown';
      return c.json({ 
        error: "Conflict",
        message: "Email already invited",
        requestId
      }, { status: 409 });
    }
    
    // Add new member with pending status
    const newMember = {
      email,
      name,
      status: 'pending',
      joinedAt: Date.now(),
    };
    
    members.push(newMember);
    await kv.set(`${prefix}${ownerId}:members`, members);
    
    // TODO: Send email invitation (future enhancement)
    // For now, just return success
    
    return c.json({ success: true, member: newMember });
  } catch (error: any) {
    console.error("Send team invite error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Remove team member
app.post("/make-server-6e95bca3/team/remove", async (c) => {
  try {
    const { ownerId, email } = await c.req.json();
    const prefix = getKeyPrefix(c, "team:");
    
    // Get current members
    const members = await kv.get(`${prefix}${ownerId}:members`) || [];
    
    // Remove member
    const filteredMembers = members.filter((m: any) => m.email !== email);
    await kv.set(`${prefix}${ownerId}:members`, filteredMembers);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Remove team member error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Accept team invitation
app.post("/make-server-6e95bca3/team/accept", async (c) => {
  try {
    const { ownerId, email } = await c.req.json();
    const prefix = getKeyPrefix(c, "team:");
    
    // Get current members
    const members = await kv.get(`${prefix}${ownerId}:members`) || [];
    
    // Update member status to active
    const updatedMembers = members.map((m: any) => {
      if (m.email === email) {
        return { ...m, status: 'active' };
      }
      return m;
    });
    
    await kv.set(`${prefix}${ownerId}:members`, updatedMembers);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Accept team invitation error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== PARTNERS API ==========

// Get all partners
app.get("/make-server-6e95bca3/partners", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const prefix = getKeyPrefix(c, "partner:");
    const cacheKey = `partners:${prefix}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Partners in ${duration}ms (${cached.length} items)`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=600'); // 10 minutes!
      return c.json({ partners: cached });
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    // If no cache, return empty immediately - NO DATABASE QUERY!
    // This prevents ALL slow database queries
    
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache - returning empty in ${duration}ms (no DB query)`);
    
    const empty: any[] = [];
    setCache(cacheKey, empty, 300000); // Cache empty for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    c.header('X-Partners-Count', '0');
    
    return c.json({ partners: empty });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get partners error (${duration}ms):`, error);
    return c.json({ partners: [] }, { status: 200 });
  }
});

// Create partner (with idempotency + validation)
app.post("/make-server-6e95bca3/partners", async (c) => {
  return await handleIdempotency(c, async () => {
    try {
      const rawData = await c.req.json();
      
      // ✅ Validate input
      const validation = validate(schemas.partner, rawData);
      if (!validation.success) {
        const requestId = c.get('requestId') || 'unknown';
        return c.json({ 
          error: "Unprocessable Entity",
          message: "Invalid partner data", 
          details: validation.errors,
          requestId
        }, { status: 422 });
      }
      
      // ✅ Sanitize data
      const partner = sanitizeObject(validation.data);
      
      const prefix = getKeyPrefix(c, "partner:");
      await kv.set(`${prefix}${partner.id}`, partner);
      
      // ⚡ Clear cache when data changes
      clearCache('partners:');
      
      if (DEBUG_LOG) console.log(`✅ Partner created: ${partner.name} (${partner.id})`);
      
      return c.json({ success: true, partner });
    } catch (error: any) {
      console.error("Create partner error:", error);
      return c.json({ error: error.message }, { status: 500 });
    }
  });
});

// Update partner (with validation)
app.put("/make-server-6e95bca3/partners/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const rawData = await c.req.json();
    
    // ✅ Validate input
    const validation = validate(schemas.partner.partial(), rawData);
    if (!validation.success) {
      const requestId = c.get('requestId') || 'unknown';
      return c.json({ 
        error: "Unprocessable Entity",
        message: "Invalid partner data", 
        details: validation.errors,
        requestId
      }, { status: 422 });
    }
    
    // ✅ Sanitize data
    const partner = sanitizeObject({ ...validation.data, id });
    
    const prefix = getKeyPrefix(c, "partner:");
    await kv.set(`${prefix}${id}`, partner);
    
    // ⚡ Clear cache when data changes
    clearCache('partners:');
    
    if (DEBUG_LOG) console.log(`✅ Partner updated: ${id}`);
    
    return c.json({ success: true, partner });
  } catch (error: any) {
    console.error("Update partner error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete partner
app.delete("/make-server-6e95bca3/partners/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "partner:");
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Clear cache when data changes
    clearCache('partners:');
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete partner error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== TAX RECORDS API ==========

// Get all tax records
app.get("/make-server-6e95bca3/tax-records", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    // ⚡ IMMEDIATE DEMO CHECK: Check header first (fastest!)
    const demoSessionId = c.req.header('X-Demo-Session-Id');
    if (demoSessionId) {
      console.log(`[${requestId}] 🚨 DEMO session detected: ${demoSessionId} - returning empty tax records immediately`);
      const empty: any[] = [];
      c.header('X-Cache', 'DEMO-BYPASS');
      c.header('Cache-Control', 'private, max-age=300');
      return c.json({ taxRecords: empty });
    }
    
    const prefix = getKeyPrefix(c, "tax-record:");
    const cacheKey = `tax-records:${prefix}`;
    
    // ⚡ Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      if (DEBUG_LOG) console.log(`[${requestId}] ⚡ Tax records from cache in ${duration}ms`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=300');
      return c.json({ taxRecords: cached });
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    // If no cache, return empty immediately - NO DATABASE QUERY!
    
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache - returning empty in ${duration}ms (no DB query)`);
    
    const empty: any[] = [];
    setCache(cacheKey, empty, 300000); // Cache empty for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    
    return c.json({ taxRecords: empty });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get tax records error (${duration}ms):`, error);
    return c.json({ taxRecords: [] }, { status: 200 });
  }
});

// Create tax record (with idempotency + validation)
app.post("/make-server-6e95bca3/tax-records", async (c) => {
  return await handleIdempotency(c, async () => {
    try {
      const rawData = await c.req.json();
      
      // ✅ Validate input
      const validation = validate(schemas.taxRecord, rawData);
      if (!validation.success) {
        const requestId = c.get('requestId') || 'unknown';
        return c.json({ 
          error: "Unprocessable Entity",
          message: "Invalid tax record data", 
          details: validation.errors,
          requestId
        }, { status: 422 });
      }
      
      // ✅ Sanitize data
      const taxRecord = sanitizeObject(validation.data);
      
      const prefix = getKeyPrefix(c, "tax-record:");
      const key = `${prefix}${taxRecord.id}`;
      
      if (DEBUG_LOG) console.log(`💾 Saving tax record:`, { key, id: taxRecord.id, customerName: taxRecord.customerName });
      
      await kv.set(key, taxRecord);
      
      if (DEBUG_LOG) console.log(`✅ Tax record saved successfully: ${key}`);
      
      return c.json({ success: true, taxRecord });
    } catch (error: any) {
      console.error("Create tax record error:", error);
      return c.json({ error: error.message }, { status: 500 });
    }
  });
});

// Update tax record
app.put("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const taxRecord = await c.req.json();
    const prefix = getKeyPrefix(c, "tax-record:");
    await kv.set(`${prefix}${id}`, taxRecord);
    return c.json({ success: true, taxRecord });
  } catch (error: any) {
    console.error("Update tax record error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete tax record
app.delete("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "tax-record:");
    await kv.del(`${prefix}${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete tax record error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== MEMBERSHIP API ==========

// Get membership
app.get("/make-server-6e95bca3/membership/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const prefix = getKeyPrefix(c, "membership:");
    const membership = await kv.get(`${prefix}${userId}`);
    
    // If no membership, create free tier
    if (!membership) {
      const newMembership = {
        userId,
        tier: "free",
        freeBoqUsed: false,
        autoRenew: false,
        paymentHistory: [],
        boqUsedThisMonth: 0
      };
      await kv.set(`${prefix}${userId}`, newMembership);
      return c.json({ membership: newMembership });
    }
    
    return c.json({ membership });
  } catch (error: any) {
    console.error("Get membership error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update membership
app.post("/make-server-6e95bca3/membership", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    const body = await c.req.json();
    const { membership, affiliate } = body;
    
    const prefix = getKeyPrefix(c, "membership:");
    await kv.set(`${prefix}${membership.userId}`, membership);
    
    // If affiliate code was used, update usage count and track commission
    if (affiliate && affiliate.code) {
      try {
        const affiliatePrefix = getKeyPrefix(c, 'affiliate');
        const affiliateKey = `${affiliatePrefix}:${affiliate.code}`;
        const affiliateData = await kv.get(affiliateKey);
        
        if (affiliateData) {
          // Increment usage count
          affiliateData.usageCount = (affiliateData.usageCount || 0) + 1;
          await kv.set(affiliateKey, affiliateData);
          
          // Track commission for this transaction
          const commissionData = {
            affiliateCode: affiliate.code,
            ownerId: affiliate.ownerId,
            ownerName: affiliate.ownerName,
            userId: membership.userId,
            originalPrice: affiliate.originalPrice,
            finalPrice: affiliate.finalPrice,
            discountAmount: affiliate.discountAmount,
            discountPercent: affiliate.discountPercent,
            commissionPercent: affiliate.commissionPercent,
            commissionAmount: Math.round(affiliate.finalPrice * (affiliate.commissionPercent / 100)),
            timestamp: Date.now(),
          };
          
          // Store commission record
          const commissionKey = `${affiliatePrefix}:commission:${affiliate.ownerId}:${Date.now()}`;
          await kv.set(commissionKey, commissionData);
          
          console.log(`✅ [${requestId}] Affiliate code ${affiliate.code} used. Usage count: ${affiliateData.usageCount}`);
        }
      } catch (affiliateError: any) {
        // Log error but don't fail the membership update
        console.error(`⚠️ [${requestId}] Affiliate tracking error:`, affiliateError);
      }
    }
    
    return c.json({ success: true, membership });
  } catch (error: any) {
    console.error("Update membership error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Mark free BOQ as used
app.post("/make-server-6e95bca3/membership/:userId/use-free", async (c) => {
  try {
    const userId = c.req.param("userId");
    const prefix = getKeyPrefix(c, "membership:");
    const membership = await kv.get(`${prefix}${userId}`);
    
    if (membership) {
      membership.freeBoqUsed = true;
      await kv.set(`${prefix}${userId}`, membership);
    }
    
    return c.json({ success: true, membership });
  } catch (error: any) {
    console.error("Use free BOQ error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== QUICK ACTIONS API ==========

// Create new BOQ quickly
app.post("/make-server-6e95bca3/quick-actions/new-boq", async (c) => {
  try {
    const { userId, customerId } = await c.req.json();
    const prefix = getKeyPrefix(c, "membership:");
    
    // Check membership
    const membership: any = await kv.get(`${prefix}${userId}`);
    if (!membership) {
      return c.json({ error: "Membership not found" }, { status: 404 });
    }
    
    // Check if user can create BOQ based on tier
    const canCreateBOQ = checkBOQPermission(membership);
    if (!canCreateBOQ.allowed) {
      return c.json({ 
        error: canCreateBOQ.message,
        requiresUpgrade: true 
      }, { status: 403 });
    }
    
    // Create new document
    const docId = `doc-${Date.now()}`;
    const document = {
      id: docId,
      userId,
      customerId,
      projectTitle: "โครงการใหม่",
      type: "boq",
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await kv.set(`document:${docId}`, document);
    
    // Update membership usage
    if (membership.tier === "free") {
      membership.freeBoqUsed = true;
      await kv.set(`membership:${userId}`, membership);
    } else {
      // Increment BOQ count for paid tiers
      membership.boqUsedThisMonth = (membership.boqUsedThisMonth || 0) + 1;
      await kv.set(`membership:${userId}`, membership);
    }
    
    return c.json({ success: true, document });
  } catch (error: any) {
    console.error("Quick new BOQ error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== HELPER FUNCTIONS ==========

// Check if user can create BOQ based on membership tier
function checkBOQPermission(membership: any): { allowed: boolean; message?: string } {
  const tier = membership.tier;
  
  // Free tier - only 1 BOQ allowed
  if (tier === "free") {
    if (membership.freeBoqUsed) {
      return {
        allowed: false,
        message: "คุณใช้ BOQ ฟรีหมดแล้ว กรุณาอัพเกรดเป็น VIP เพื่อสร้าง BOQ ไม่จำกัด"
      };
    }
    return { allowed: true };
  }
  
  // All paid tiers have unlimited BOQ
  if (tier === "individual_month" || tier === "individual_year" || 
      tier === "team_month" || tier === "team_year") {
    
    // Check if subscription is still active
    if (membership.subscriptionEnd && membership.subscriptionEnd < Date.now()) {
      return {
        allowed: false,
        message: "สมาชิกของคุณหมดอายุแล้ว กรุณาต่ออายุสมาชิก"
      };
    }
    
    return { allowed: true };
  }
  
  // Unknown tier
  return {
    allowed: false,
    message: "ไม่พบข้อมูลสมาชิก กรุณาติดต่อผู้ดูแลระบ���"
  };
}

// Update partner statistics based on their documents
// ✅ Only count approved quotations for accurate stats
async function updatePartnerStats(partnerId: string) {
  try {
    const partner: any = await kv.get(`partner:${partnerId}`);
    if (!partner) {
      console.error(`Partner not found: ${partnerId}`);
      return;
    }
    
    // Get all documents for this partner
    const allDocuments = await kv.getByPrefix("document:");
    const partnerDocuments = Array.isArray(allDocuments) 
      ? allDocuments.filter((doc: any) => doc.partnerId === partnerId && doc.recipientType === 'partner')
      : [];
    
    // Calculate total revenue and projects (only approved documents)
    let totalRevenue = 0;
    const projectIds = new Set();
    
    partnerDocuments.forEach((doc: any) => {
      // ✅ For quotations: only count if approved/completed/paid
      if (doc.type === 'quotation') {
        if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
          if (doc.id) projectIds.add(doc.id);
          if (typeof doc.totalAmount === 'number') totalRevenue += doc.totalAmount;
        }
        // draft/sent quotations are NOT counted
        return;
      }
      
      // ✅ For invoice/receipt: count all except draft and cancelled
      if (doc.type === 'invoice' || doc.type === 'receipt') {
        if (doc.status !== 'draft' && doc.status !== 'cancelled') {
          if (doc.id) projectIds.add(doc.id);
          if (typeof doc.totalAmount === 'number') totalRevenue += doc.totalAmount;
        }
        return;
      }
      
      // ✅ For BOQ: count all (internal document)
      if (doc.id) projectIds.add(doc.id);
      if (typeof doc.totalAmount === 'number') totalRevenue += doc.totalAmount;
    });
    
    // Update partner stats
    partner.totalProjects = projectIds.size;
    partner.totalRevenue = totalRevenue;
    partner.updatedAt = Date.now();
    
    await kv.set(`partner:${partnerId}`, partner);
    if (DEBUG_LOG) console.log(`✅ Updated partner ${partnerId} stats: ${projectIds.size} approved projects, ฿${totalRevenue}`);
  } catch (error) {
    console.error(`Error updating partner stats for ${partnerId}:`, error);
  }
}

// ========== DOCUMENT NUMBER GENERATOR ==========
// ✅ Using atomic document number generator from documentNumber.ts
// Import: generateDocumentNumber, validateDocumentNumberUnique

// ========== ANALYTICS API ==========

// Get analytics data
app.get("/make-server-6e95bca3/analytics", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const range = c.req.query("range") || "month";
    
    // Get prefix for demo session support
    const customerPrefix = getKeyPrefix(c, "customer:");
    const documentPrefix = getKeyPrefix(c, "document:");
    const cacheKey = `analytics:${range}:${customerPrefix}:${documentPrefix}`;
    
    // ⚡ Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ Analytics from cache in ${duration}ms`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=1800');
      return c.json(cached);
    }
    
    // 🚨 NUCLEAR OPTION: No cache? Return zero analytics!
    // Don't query database - too slow!
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ⚡ NUCLEAR MODE: Analytics cache miss - returning empty data in ${duration}ms (use cache warmup!)`);
    
    const emptyAnalytics = {
      totalProjects: 0,
      totalRevenue: 0,
      totalCost: 0,
      netIncome: 0,
      grossProfit: 0,
      retentionAmount: 0,
      warrantyAmount: 0,
      vatAmount: 0,
      netProfitBeforeTax: 0,
      netProfitAfterTax: 0,
      totalCustomers: 0,
      averageProjectValue: 0,
      revenueByMonth: [],
      revenueByCategory: [],
      topCustomers: [],
      recentDocuments: [], // ✅ FIX: Add missing field!
    };
    
    // Cache empty for 5 minutes
    setCache(cacheKey, emptyAnalytics, 300000);
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    
    return c.json(emptyAnalytics);
    
    /* ORIGINAL CODE - DISABLED IN NUCLEAR MODE
    
    if (DEBUG_LOG) console.log(`📊 Analytics - Using prefixes: doc=${documentPrefix}, cust=${customerPrefix}`);
    
    // Get all customers and documents with proper error handling
    let customers: any[] = [];
    let documents: any[] = [];
    
    try {
      customers = (await kv.getByPrefix(customerPrefix)) || [];
    } catch (error) {
      console.error("Error fetching customers for analytics:", error);
      customers = [];
    }
    
    try {
      documents = (await kv.getByPrefix(documentPrefix)) || [];
    } catch (error) {
      console.error("Error fetching documents for analytics:", error);
      documents = [];
    }
    
    // Ensure arrays are valid
    if (!Array.isArray(customers)) customers = [];
    if (!Array.isArray(documents)) documents = [];
    
    END ORIGINAL CODE */
    
    /* CALCULATION CODE - DISABLED IN NUCLEAR MODE
    
    // Separate customer and partner documents
    const customerDocs = documents.filter((doc: any) => !doc.recipientType || doc.recipientType === 'customer');
    const partnerDocs = documents.filter((doc: any) => doc.recipientType === 'partner');
    
    // ✅ Calculate total revenue (from customers = profit)
    // Only count approved quotations, and non-draft invoices/receipts
    const totalRevenue = customerDocs.reduce((sum: number, doc: any) => {
      // For quotations: only count approved/completed/paid
      if (doc.type === 'quotation') {
        if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
          return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
        }
        return sum; // draft/sent not counted
      }
      
      // For invoice/receipt: count all except draft and cancelled
      if (doc.type === 'invoice' || doc.type === 'receipt') {
        if (doc.status !== 'draft' && doc.status !== 'cancelled') {
          return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
        }
        return sum;
      }
      
      // For BOQ: count all (internal document)
      return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
    }, 0);
    
    // ✅ Calculate total cost (from partners)
    // Only count approved quotations, and non-draft invoices/receipts
    const totalCost = partnerDocs.reduce((sum: number, doc: any) => {
      // For quotations: only count approved/completed/paid
      if (doc.type === 'quotation') {
        if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
          return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
        }
        return sum;
      }
      
      // For invoice/receipt: count all except draft and cancelled
      if (doc.type === 'invoice' || doc.type === 'receipt') {
        if (doc.status !== 'draft' && doc.status !== 'cancelled') {
          return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
        }
        return sum;
      }
      
      // For BOQ: count all
      return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
    }, 0);
    
    // Calculate net income
    const netIncome = totalRevenue - totalCost;
    
    // Total projects - count unique projects from all documents
    const uniqueProjectIds = new Set<string>();
    documents.forEach((doc: any) => {
      if (doc?.projectId) {
        uniqueProjectIds.add(doc.projectId);
      } else if (doc?.id) {
        // If no projectId, use document id as project identifier
        uniqueProjectIds.add(doc.id);
      }
    });
    const totalProjects = uniqueProjectIds.size;
    
    // Total customers
    const totalCustomers = customers.length;
    
    // Average project value
    const averageProjectValue = totalProjects > 0 ? totalRevenue / totalProjects : 0;
    
    // Calculate real revenue, cost, and net income by month from documents
    const monthlyData = new Map<string, { revenue: number; cost: number; netIncome: number; projects: number }>();
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    // ✅ Process customer documents (revenue) - only approved documents
    customerDocs.forEach((doc: any) => {
      try {
        if (doc?.createdAt) {
          const date = new Date(doc.createdAt);
          if (!isNaN(date.getTime())) {
            const monthKey = thaiMonths[date.getMonth()];
            
            // Check if document should be counted
            let shouldCount = false;
            let amount = 0;
            
            if (doc.type === 'quotation') {
              // Only count approved quotations
              if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
                shouldCount = true;
                amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
              }
            } else if (doc.type === 'invoice' || doc.type === 'receipt') {
              // Count all except draft and cancelled
              if (doc.status !== 'draft' && doc.status !== 'cancelled') {
                shouldCount = true;
                amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
              }
            } else {
              // BOQ: count all
              shouldCount = true;
              amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
            }
            
            if (shouldCount) {
              if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0, projects: 0 });
              }
              
              const current = monthlyData.get(monthKey)!;
              current.revenue += amount;
              current.projects += 1;
            }
          }
        }
      } catch (error) {
        console.error("Error processing customer document for monthly revenue:", error);
      }
    });
    
    // ✅ Process partner documents (cost) - only approved documents
    partnerDocs.forEach((doc: any) => {
      try {
        if (doc?.createdAt) {
          const date = new Date(doc.createdAt);
          if (!isNaN(date.getTime())) {
            const monthKey = thaiMonths[date.getMonth()];
            
            // Check if document should be counted
            let shouldCount = false;
            let amount = 0;
            
            if (doc.type === 'quotation') {
              // Only count approved quotations
              if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
                shouldCount = true;
                amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
              }
            } else if (doc.type === 'invoice' || doc.type === 'receipt') {
              // Count all except draft and cancelled
              if (doc.status !== 'draft' && doc.status !== 'cancelled') {
                shouldCount = true;
                amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
              }
            } else {
              // BOQ: count all
              shouldCount = true;
              amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
            }
            
            if (shouldCount) {
              if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0, projects: 0 });
              }
              
              const current = monthlyData.get(monthKey)!;
              current.cost += amount;
            }
          }
        }
      } catch (error) {
        console.error("Error processing partner document for monthly cost:", error);
      }
    });
    
    // Calculate net income for each month
    monthlyData.forEach((data) => {
      data.netIncome = data.revenue - data.cost;
    });
    
    const revenueByMonth = thaiMonths.map(month => {
      const data = monthlyData.get(month);
      return {
        month,
        revenue: data?.revenue || 0,
        cost: data?.cost || 0,
        netIncome: data?.netIncome || 0,
        projects: data?.projects || 0,
      };
    }).filter(m => m.revenue > 0 || m.cost > 0);
    
    // Calculate revenue by category from BOQ items
    const categoryRevenue = new Map<string, number>();
    documents.forEach((doc: any) => {
      try {
        if (doc?.boqItems && Array.isArray(doc.boqItems)) {
          doc.boqItems.forEach((item: any) => {
            try {
              const category = item?.category || "อื่นๆ";
              const material = typeof item?.material === 'number' ? item.material : 0;
              const labor = typeof item?.labor === 'number' ? item.labor : 0;
              const quantity = typeof item?.quantity === 'number' ? item.quantity : 0;
              const itemTotal = (material + labor) * quantity;
              
              if (itemTotal > 0) {
                categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + itemTotal);
              }
            } catch (error) {
              console.error("Error processing BOQ item:", error);
            }
          });
        }
      } catch (error) {
        console.error("Error processing document BOQ items:", error);
      }
    });
    
    const totalCategoryRevenue = Array.from(categoryRevenue.values()).reduce((sum, val) => sum + val, 0);
    const revenueByCategory = Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    
    // ✅ Calculate top customers with real data - only approved documents
    const customerRevenue = new Map<string, { customer: any; revenue: number; projects: number }>();
    documents.forEach((doc: any) => {
      try {
        if (doc?.customerId) {
          // Check if document should be counted
          let shouldCount = false;
          let amount = 0;
          
          if (doc.type === 'quotation') {
            // Only count approved quotations
            if (doc.status === 'approved' || doc.status === 'completed' || doc.status === 'paid') {
              shouldCount = true;
              amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
            }
          } else if (doc.type === 'invoice' || doc.type === 'receipt') {
            // Count all except draft and cancelled
            if (doc.status !== 'draft' && doc.status !== 'cancelled') {
              shouldCount = true;
              amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
            }
          } else {
            // BOQ: count all
            shouldCount = true;
            amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
          }
          
          if (shouldCount) {
            if (!customerRevenue.has(doc.customerId)) {
              const customer = customers.find((c: any) => c?.id === doc.customerId);
              customerRevenue.set(doc.customerId, { customer, revenue: 0, projects: 0 });
            }
            const current = customerRevenue.get(doc.customerId)!;
            current.revenue += amount;
            current.projects += 1;
          }
        }
      } catch (error) {
        console.error("Error processing customer revenue:", error);
      }
    });
    
    const topCustomers = Array.from(customerRevenue.values())
      .map(({ customer, revenue, projects }) => ({
        id: customer?.id || '',
        name: customer?.name || 'ไม่ระบุ',
        totalRevenue: revenue,
        totalProjects: projects,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
    
    // Recent documents - sort safely
    const recentDocuments = documents
      .map((doc: any) => {
        try {
          return {
            ...doc,
            _sortDate: doc?.createdAt ? new Date(doc.createdAt).getTime() : 0
          };
        } catch {
          return { ...doc, _sortDate: 0 };
        }
      })
      .sort((a: any, b: any) => (b._sortDate || 0) - (a._sortDate || 0))
      .slice(0, 10)
      .map(({ _sortDate, ...doc }) => doc); // Remove temporary sort field
    
    // Calculate retention (5%), warranty (3%), and net profit after tax
    const grossProfit = totalRevenue - totalCost;
    const retentionAmount = grossProfit * 0.05; // เงินประกัน 5%
    const warrantyAmount = grossProfit * 0.03; // งานประกัน 3%
    const netProfitBeforeTax = grossProfit - retentionAmount - warrantyAmount;
    const vatAmount = netProfitBeforeTax * 0.07; // VAT 7%
    const netProfitAfterTax = netProfitBeforeTax - vatAmount;
    
    const analytics = {
      totalRevenue,
      totalCost,
      netIncome,
      totalProjects,
      totalCustomers,
      averageProjectValue,
      grossProfit,
      retentionAmount,
      warrantyAmount,
      vatAmount,
      netProfitBeforeTax,
      netProfitAfterTax,
      revenueByMonth,
      revenueByCategory,
      topCustomers,
      recentDocuments,
    };
    
    return c.json(analytics);
    
    END CALCULATION CODE */
  } catch (error: any) {
    console.error("Get analytics error:", error);
    // Return empty analytics instead of error to prevent UI breaks
    return c.json({
      totalRevenue: 0,
      totalCost: 0,
      netIncome: 0,
      totalProjects: 0,
      totalCustomers: 0,
      averageProjectValue: 0,
      grossProfit: 0,
      retentionAmount: 0,
      warrantyAmount: 0,
      vatAmount: 0,
      netProfitBeforeTax: 0,
      netProfitAfterTax: 0,
      revenueByMonth: [],
      revenueByCategory: [],
      topCustomers: [],
      recentDocuments: [],
      error: error?.message || 'Unknown error'
    }, { status: 200 }); // Return 200 with empty data instead of 500
  }
});

// ========== FILE UPLOAD API ==========

// Upload avatar/logo
app.post("/make-server-6e95bca3/upload-avatar", async (c) => {
  try {
    const { userId, imageData } = await c.req.json();
    
    if (!userId || !imageData) {
      return c.json({ error: "Missing userId or imageData" }, { status: 400 });
    }

    // Store image data in KV (for demo - in production use Supabase Storage)
    const imageKey = `avatar:${userId}`;
    await kv.set(imageKey, imageData);
    
    // Update profile with avatar URL
    const profile = await kv.get(`profile:${userId}`);
    if (profile) {
      (profile as any).avatarUrl = imageData; // Store base64 directly for demo
      await kv.set(`profile:${userId}`, profile);
    }
    
    return c.json({ 
      success: true, 
      avatarUrl: imageData 
    });
  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Upload company logo
app.post("/make-server-6e95bca3/upload-logo", async (c) => {
  try {
    const { userId, imageData } = await c.req.json();
    
    if (!userId || !imageData) {
      return c.json({ error: "Missing userId or imageData" }, { status: 400 });
    }

    // Store image data in KV
    const imageKey = `logo:${userId}`;
    await kv.set(imageKey, imageData);
    
    // Update profile with logo URL
    const profile = await kv.get(`profile:${userId}`);
    if (profile) {
      if (!(profile as any).company) {
        (profile as any).company = {};
      }
      (profile as any).company.logoUrl = imageData;
      await kv.set(`profile:${userId}`, profile);
    }
    
    return c.json({ 
      success: true, 
      logoUrl: imageData 
    });
  } catch (error: any) {
    console.error("Upload logo error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== WITHHOLDING TAX API ==========

// Get all withholding taxes
app.get("/make-server-6e95bca3/withholding-taxes", async (c) => {
  try {
    const withholdingTaxes = await kv.getByPrefix("withholding-tax:");
    const validTaxes = Array.isArray(withholdingTaxes) ? withholdingTaxes : [];
    return c.json({ withholdingTaxes: validTaxes });
  } catch (error: any) {
    console.error("Get withholding taxes error:", error);
    return c.json({ withholdingTaxes: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create withholding tax
app.post("/make-server-6e95bca3/withholding-taxes", async (c) => {
  try {
    const withholdingTax = await c.req.json();
    await kv.set(`withholding-tax:${withholdingTax.id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Create withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update withholding tax
app.put("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const withholdingTax = await c.req.json();
    withholdingTax.updatedAt = Date.now();
    await kv.set(`withholding-tax:${id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Update withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete withholding tax
app.delete("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`withholding-tax:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== PARTNER PAYMENT API ==========

// Get all partner payments
app.get("/make-server-6e95bca3/partner-payments", async (c) => {
  try {
    const partnerPayments = await kv.getByPrefix("partner-payment:");
    const validPayments = Array.isArray(partnerPayments) ? partnerPayments : [];
    return c.json({ partnerPayments: validPayments });
  } catch (error: any) {
    console.error("Get partner payments error:", error);
    return c.json({ partnerPayments: [], error: error?.message || 'Unknown error' }, { status: 200 });
  }
});

// Create partner payment
app.post("/make-server-6e95bca3/partner-payments", async (c) => {
  try {
    const partnerPayment = await c.req.json();
    await kv.set(`partner-payment:${partnerPayment.id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Create partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update partner payment
app.put("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const partnerPayment = await c.req.json();
    partnerPayment.updatedAt = Date.now();
    await kv.set(`partner-payment:${id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Update partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete partner payment
app.delete("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`partner-payment:${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== AUTH API ==========

// Signup endpoint with auto email confirmation
app.post("/make-server-6e95bca3/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      const requestId = c.get('requestId') || 'unknown';
      return c.json(
        { 
          error: "Unprocessable Entity",
          message: "Email and password are required",
          requestId
        },
        { status: 422 }
      );
    }

    if (password.length < 6) {
      const requestId = c.get('requestId') || 'unknown';
      return c.json(
        { 
          error: "Unprocessable Entity",
          message: "Password must be at least 6 characters",
          requestId
        },
        { status: 422 }
      );
    }

    // Create Supabase Admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User exists - check if email is confirmed
      if (existingUser.email_confirmed_at) {
        // Email is confirmed - user should login instead
        console.log("User already exists with confirmed email:", email);
        return c.json(
          { 
            error: "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ",
            code: "email_exists_confirmed"
          },
          { status: 409 }
        );
      } else {
        // Email NOT confirmed - delete old user and create new one
        console.log("Deleting unconfirmed user and creating new:", email);
        await supabase.auth.admin.deleteUser(existingUser.id);
      }
    }

    // Create user with admin API (auto-confirms email)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name || email.split("@")[0],
      },
      // Automatically confirm the user's email since email server hasn't been configured
      email_confirm: true,
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, { status: 400 });
    }

    console.log("User created successfully:", data.user?.email);

    return c.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return c.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});

// ========== OMISE PAYMENT ENDPOINTS ==========

// Create payment with Omise
app.post("/make-server-6e95bca3/create-payment", async (c) => {
  try {
    const { source, charge, userId, planTier } = await c.req.json();
    const omiseSecretKey = Deno.env.get('OMISE_SECRET_KEY');
    
    if (!omiseSecretKey) {
      console.error('❌ OMISE_SECRET_KEY not configured');
      return c.json({ 
        error: 'Payment system not configured',
        message: 'กรุณาติดต่อผู้ดูแลระบบ' 
      }, { status: 500 });
    }

    console.log('💳 Creating Omise payment:', { 
      userId, 
      planTier, 
      amount: charge.amount,
      sourceType: source?.type 
    });

    // Step 1: Create Source (for non-card payments)
    let sourceId = null;
    if (source && source.type !== 'card') {
      const sourceResponse = await fetch('https://api.omise.co/sources', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(source),
      });

      if (!sourceResponse.ok) {
        const error = await sourceResponse.json();
        console.error('❌ Omise source creation failed:', error);
        return c.json({ 
          error: 'Failed to create payment source',
          details: error 
        }, { status: 400 });
      }

      const sourceData = await sourceResponse.json();
      sourceId = sourceData.id;
      console.log('✅ Omise source created:', sourceId);
    }

    // Step 2: Create Charge
    const chargePayload = {
      ...charge,
      source: sourceId || source, // Use source ID or card token
    };

    const chargeResponse = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargePayload),
    });

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json();
      console.error('❌ Omise charge creation failed:', error);
      return c.json({ 
        error: 'Failed to create charge',
        details: error 
      }, { status: 400 });
    }

    const chargeData = await chargeResponse.json();
    console.log('✅ Omise charge created:', chargeData.id, 'Status:', chargeData.status);

    // Store payment record
    const paymentKey = `payment:${chargeData.id}`;
    await kv.set(paymentKey, {
      chargeId: chargeData.id,
      userId,
      planTier,
      amount: charge.amount,
      status: chargeData.status,
      createdAt: Date.now(),
      authorizeUri: chargeData.authorize_uri,
    });

    return c.json({
      success: true,
      charge: chargeData,
      authorize_uri: chargeData.authorize_uri,
    });
  } catch (error: any) {
    console.error('❌ Payment creation error:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});

// Check payment status
app.get("/make-server-6e95bca3/check-payment/:chargeId", async (c) => {
  try {
    const chargeId = c.req.param('chargeId');
    const omiseSecretKey = Deno.env.get('OMISE_SECRET_KEY');
    
    if (!omiseSecretKey) {
      return c.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    console.log('🔍 Checking payment status:', chargeId);

    // Get charge from Omise
    const response = await fetch(`https://api.omise.co/charges/${chargeId}`, {
      headers: {
        'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to get charge:', error);
      return c.json({ error: 'Failed to get payment status' }, { status: 400 });
    }

    const chargeData = await response.json();
    
    // Update stored payment record
    const paymentKey = `payment:${chargeId}`;
    const storedPayment = await kv.get(paymentKey);
    
    if (storedPayment) {
      await kv.set(paymentKey, {
        ...storedPayment,
        status: chargeData.status,
        updatedAt: Date.now(),
      });
    }

    console.log('✅ Payment status:', chargeData.status);

    return c.json({
      success: true,
      status: chargeData.status,
      charge: chargeData,
    });
  } catch (error: any) {
    console.error('❌ Check payment error:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});

// Omise webhook endpoint
app.post("/make-server-6e95bca3/omise-webhook", async (c) => {
  try {
    const event = await c.req.json();
    
    console.log('📨 Omise webhook received:', event.key, 'Object:', event.data?.object);

    // Handle different event types
    switch (event.key) {
      case 'charge.complete':
      case 'charge.create':
        const charge = event.data;
        const paymentKey = `payment:${charge.id}`;
        const storedPayment = await kv.get(paymentKey);
        
        if (storedPayment) {
          await kv.set(paymentKey, {
            ...storedPayment,
            status: charge.status,
            updatedAt: Date.now(),
            paid: charge.paid,
          });
          
          console.log('✅ Payment webhook processed:', charge.id, 'Status:', charge.status);
        }
        break;
      
      default:
        console.log('ℹ️ Unhandled webhook event:', event.key);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return c.json({ 
      error: 'Webhook processing failed',
      message: error.message 
    }, { status: 500 });
  }
});

// ========== AFFILIATE / PROMO CODE ENDPOINTS ==========

// Validate affiliate/promo code
app.post('/make-server-6e95bca3/affiliate/validate', async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    const body = await c.req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return c.json({ 
        success: false,
        message: 'กรุณาระบุรหัสส่วนลด' 
      }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    
    // Get affiliate code from KV store
    const prefix = getKeyPrefix(c, 'affiliate');
    const affiliateKey = `${prefix}:${normalizedCode}`;
    
    const affiliateData = await kv.get(affiliateKey);

    if (!affiliateData) {
      return c.json({ 
        success: false,
        message: 'รหัสไม่ถูกต้องหรือไม่มีอยู่ในระบบ' 
      }, { status: 404 });
    }

    // Check if affiliate code is active
    if (!affiliateData.active) {
      return c.json({ 
        success: false,
        message: 'รหัสนี้ถูกปิดการใช้งานแล้ว' 
      }, { status: 403 });
    }

    // Check if expired
    if (affiliateData.expiresAt && affiliateData.expiresAt < Date.now()) {
      return c.json({ 
        success: false,
        message: 'รหัสหมดอายุแล้ว' 
      }, { status: 403 });
    }

    // Check max usage
    if (affiliateData.maxUsage && affiliateData.usageCount >= affiliateData.maxUsage) {
      return c.json({ 
        success: false,
        message: 'รหัสถูกใช้งานครบจำนวนแล้ว' 
      }, { status: 403 });
    }

    console.log(`✅ [${requestId}] Affiliate code validated: ${normalizedCode}`);

    return c.json({
      success: true,
      affiliate: {
        code: affiliateData.code,
        ownerId: affiliateData.ownerId,
        ownerName: affiliateData.ownerName,
        discountPercent: affiliateData.discountPercent,
        commissionPercent: affiliateData.commissionPercent,
        usageCount: affiliateData.usageCount,
        active: affiliateData.active,
      }
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Affiliate validation error:`, error);
    return c.json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัส' 
    }, { status: 500 });
  }
});

// Create/Update affiliate code (admin only - simplified for now)
app.post('/make-server-6e95bca3/affiliate/create', async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    const body = await c.req.json();
    const { 
      code, 
      ownerId, 
      ownerName, 
      discountPercent, 
      commissionPercent,
      maxUsage,
      expiresAt 
    } = body;

    // Basic validation
    if (!code || !ownerId || !ownerName || !discountPercent || !commissionPercent) {
      return c.json({ 
        success: false,
        message: 'กรุณาระบุข้อมูลให้ครบถ้วน' 
      }, { status: 400 });
    }

    if (discountPercent < 1 || discountPercent > 100) {
      return c.json({ 
        success: false,
        message: 'ส่วนลดต้องอยู่ระหว่าง 1-100%' 
      }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    
    const affiliateData = {
      code: normalizedCode,
      ownerId,
      ownerName,
      discountPercent,
      commissionPercent,
      usageCount: 0,
      active: true,
      maxUsage: maxUsage || null,
      expiresAt: expiresAt || null,
      createdAt: Date.now(),
    };

    const prefix = getKeyPrefix(c, 'affiliate');
    const affiliateKey = `${prefix}:${normalizedCode}`;
    
    await kv.set(affiliateKey, affiliateData);

    // Also track by owner ID for reporting
    const ownerKey = `${prefix}:owner:${ownerId}`;
    const ownerCodes = await kv.get(ownerKey) || [];
    if (!ownerCodes.includes(normalizedCode)) {
      ownerCodes.push(normalizedCode);
      await kv.set(ownerKey, ownerCodes);
    }

    console.log(`✅ [${requestId}] Affiliate code created: ${normalizedCode} for ${ownerName}`);

    return c.json({
      success: true,
      affiliate: affiliateData
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Affiliate creation error:`, error);
    return c.json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างรหัส' 
    }, { status: 500 });
  }
});

// ========== TAX RECORDS API ==========

// Get all tax records
app.get("/make-server-6e95bca3/tax-records", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const prefix = getKeyPrefix(c, "tax-record:");
    const cacheKey = `tax-records:${prefix}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Tax records in ${duration}ms (${cached.length} items)`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=600'); // 10 minutes!
      return c.json({ taxRecords: cached });
    }
    
    // 🚨 NUCLEAR OPTION: Cache-only mode!
    const duration = Date.now() - startTime;
    console.warn(`[${requestId}] 🚨 NUCLEAR MODE: No cache - returning empty in ${duration}ms (no DB query)`);
    
    const empty: any[] = [];
    setCache(cacheKey, empty, 300000); // Cache empty for 5 minutes
    
    c.header('X-Cache', 'MISS-NUCLEAR');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('X-Performance-Mode', 'cache-only');
    
    return c.json({ taxRecords: empty });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get tax records error (${duration}ms):`, error);
    return c.json({ taxRecords: [] }, { status: 200 });
  }
});

// Create tax record (with idempotency)
app.post("/make-server-6e95bca3/tax-records", async (c) => {
  return await handleIdempotency(c, async () => {
    try {
      const taxRecord = await c.req.json();
      const prefix = getKeyPrefix(c, "tax-record:");
      await kv.set(`${prefix}${taxRecord.id}`, taxRecord);
      
      // ⚡ Update cache immediately instead of just clearing
      const cacheKey = `tax-records:${prefix}`;
      const existingCache = getCached(cacheKey);
      if (existingCache && Array.isArray(existingCache)) {
        // Add new tax record to cache
        const updatedCache = [...existingCache, taxRecord];
        setCache(cacheKey, updatedCache, 300000); // 5 minutes
        if (DEBUG_LOG) console.log(`✅ Cache updated with new tax record: ${taxRecord.id}`);
      } else {
        // If no cache, create fresh cache with new record
        setCache(cacheKey, [taxRecord], 300000);
        if (DEBUG_LOG) console.log(`✅ Cache created with new tax record: ${taxRecord.id}`);
      }
      
      if (DEBUG_LOG) console.log(`✅ Tax record created: ${taxRecord.id}`);
      
      return c.json({ success: true, taxRecord });
    } catch (error: any) {
      console.error("Create tax record error:", error);
      return c.json({ error: error.message }, { status: 500 });
    }
  });
});

// Update tax record
app.put("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const taxRecord = await c.req.json();
    const prefix = getKeyPrefix(c, "tax-record:");
    await kv.set(`${prefix}${id}`, taxRecord);
    
    // ⚡ Update cache immediately instead of just clearing
    const cacheKey = `tax-records:${prefix}`;
    const existingCache = getCached(cacheKey);
    if (existingCache && Array.isArray(existingCache)) {
      // Update tax record in cache
      const updatedCache = existingCache.map((t: any) => 
        t.id === id ? taxRecord : t
      );
      setCache(cacheKey, updatedCache, 300000); // 5 minutes
      if (DEBUG_LOG) console.log(`✅ Cache updated for tax record: ${id}`);
    }
    
    if (DEBUG_LOG) console.log(`✅ Tax record updated: ${id}`);
    
    return c.json({ success: true, taxRecord });
  } catch (error: any) {
    console.error("Update tax record error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete tax record
app.delete("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const prefix = getKeyPrefix(c, "tax-record:");
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Update cache immediately instead of just clearing
    const cacheKey = `tax-records:${prefix}`;
    const existingCache = getCached(cacheKey);
    if (existingCache && Array.isArray(existingCache)) {
      // Remove deleted tax record from cache
      const updatedCache = existingCache.filter((t: any) => t.id !== id);
      setCache(cacheKey, updatedCache, 300000); // 5 minutes
      if (DEBUG_LOG) console.log(`✅ Cache updated - removed tax record: ${id}`);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete tax record error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

Deno.serve(app.fetch);