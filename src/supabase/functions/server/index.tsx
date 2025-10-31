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
import { calculateAnalytics } from "./analytics.ts";

const app = new Hono();

// ===== DEMO GUARD (production kill-switch) =====
const IS_PROD =
  (typeof Deno !== 'undefined' && (Deno.env.get('APP_ENV') === 'production' || Deno.env.get('NODE_ENV') === 'production' || Deno.env.get('ENV') === 'production'))
  || (typeof process !== 'undefined' && (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production'));

const notFound = (c: any) => c.text('Not Found', 404);
const demoGuard = <H extends (c:any)=>Promise<any>>(h: H) => (c:any) => IS_PROD ? notFound(c) : h(c);

// ปิด prefix ที่เป็น demo/test/sandbox ทั้งก้อน ใน prod
if (IS_PROD) {
  app.route("/make-server-6e95bca3/demo", (subApp) => subApp.all("*", notFound));
  app.route("/make-server-6e95bca3/sandbox", (subApp) => subApp.all("*", notFound));
  app.route("/make-server-6e95bca3/test", (subApp) => subApp.all("*", notFound));
  console.log('🔒 PRODUCTION MODE: Demo/Sandbox/Test routes are DISABLED');
}

// 🎯 Production Config
const IS_PRODUCTION = Deno.env.get('ENV') === 'production';
const DEBUG_LOG = !IS_PRODUCTION; // Debug logging only in non-production

// 🔄 API Version: 2.2.0 - Full status support: draft/sent/approved/completed/paid/overdue/cancelled (2025-01-28)

// ========== DEMO SESSION HELPER ==========

/**
 * 🔒 CRITICAL: Global Authentication Middleware
 * Extract and validate user ID from JWT access token
 * This MUST be applied to ALL routes requiring user data
 */
async function globalAuthMiddleware(c: any, next: any): Promise<Response | void> {
  const path = c.req.path;
  const method = c.req.method;
  
  if (DEBUG_LOG) {
    console.log(`🔐 Global auth middleware: ${method} ${path}`);
  }
  
  // Skip auth for public endpoints
  const publicEndpoints = [
    '/make-server-6e95bca3/livez',
    '/make-server-6e95bca3/readyz',
    '/make-server-6e95bca3/version',
    '/make-server-6e95bca3/health',
    '/make-server-6e95bca3/signup',
    '/make-server-6e95bca3/omise-webhook',
  ];
  
  // Skip auth for OPTIONS (preflight) requests
  if (method === 'OPTIONS') {
    if (DEBUG_LOG) console.log(`✅ Skipping auth for OPTIONS request: ${path}`);
    await next();
    return;
  }
  
  // Check if this is a public endpoint
  if (publicEndpoints.some(ep => path === ep)) {
    if (DEBUG_LOG) console.log(`✅ Skipping auth for public endpoint: ${path}`);
    await next();
    return;
  }
  
  // Get Authorization header
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`❌ [Supabase] No Authorization header for ${method} ${path}`);
    return c.text('Unauthorized - Missing or invalid Authorization header', 401);
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // ⚠️ CRITICAL CHECK 1: Check if token is the ANON_KEY
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (token === anonKey) {
    console.error(`❌ [Supabase] Client sent ANON_KEY instead of access_token!`);
    console.error(`❌ [Supabase] This means the client is not authenticated properly`);
    return c.text('Unauthorized - Please login to get an access token', 401);
  }
  
  // ⚠️ CRITICAL CHECK 2: Verify JWT structure before sending to Supabase
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    console.error(`❌ [Supabase] Invalid JWT structure! Parts: ${jwtParts.length}`);
    console.error(`❌ [Supabase] Token length: ${token.length}`);
    console.error(`❌ [Supabase] Token might be ANON_KEY instead of access_token`);
    return c.text('Unauthorized - Invalid token format', 401);
  }
  
  // ⚠️ CRITICAL CHECK 3: Verify JWT has 'sub' claim before sending to Supabase
  try {
    const payload = JSON.parse(atob(jwtParts[1]));
    
    if (!payload.sub) {
      console.error(`❌ [Supabase] JWT missing 'sub' claim!`);
      console.error(`❌ [Supabase] This means the token is not a valid user access token`);
      return c.text('Unauthorized - Invalid token (missing user ID)', 401);
    }
    
    // ⚠️ CRITICAL CHECK 4: Verify token is not expired
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.error(`❌ [Supabase] JWT token expired!`);
        console.error(`❌ [Supabase] Expired at: ${new Date(payload.exp * 1000).toISOString()}`);
        console.error(`❌ [Supabase] Current time: ${new Date(now * 1000).toISOString()}`);
        return c.text('Unauthorized - Token expired, please refresh your session', 401);
      }
    }
  } catch (e) {
    console.error(`❌ [Supabase] Failed to parse JWT payload:`, e);
    return c.text('Unauthorized - Invalid token format', 401);
  }
  
  // Validate token with Supabase
  try {
    // 🔒 SECURITY: Use SERVICE_ROLE_KEY to properly validate JWT tokens
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Use getUser(token) to validate the token properly
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user || !user.id) {
      // 🐛 Only log detailed error info in debug mode or for critical errors
      if (DEBUG_LOG || (error as any)?.code === 'bad_jwt') {
        console.error(`❌ [Supabase] Failed to authenticate user: ${error?.message || 'No user ID'}`);
        console.error(`❌ [Supabase] Full error object:`, JSON.stringify(error, null, 2));
        console.error(`❌ [Supabase] Error type:`, typeof error);
        console.error(`❌ [Supabase] Error keys:`, error ? Object.keys(error) : 'null');
        
        // Special handling for bad_jwt error
        if ((error as any)?.code === 'bad_jwt') {
          console.error('❌ [Supabase] 🚨 BAD JWT ERROR DETECTED!');
          console.error('❌ [Supabase] 🚨 This means the token is not a valid JWT or is malformed');
          console.error('❌ [Supabase] 🚨 Token might be ANON_KEY instead of access_token');
        }
      }
      
      return c.text('Unauthorized - Invalid or expired token', 401);
    }
    
    // Store user ID in context for use by endpoints
    c.set('userId', user.id);
    c.set('userEmail', user.email);
    
    console.log(`✅ Authenticated user: ${user.id} (${user.email})`);
    
    await next();
  } catch (error: any) {
    console.error('❌ Error in auth middleware:', error.message);
    return c.text('Unauthorized - Authentication failed', 401);
  }
}

/**
 * 🔒 Get userId from context (set by global middleware)
 * This is the new preferred way to get userId
 */
async function getUserIdFromAuth(c: any): Promise<string | null> {
  // Try to get userId from context first (set by global middleware)
  const userId = c.get('userId');
  if (userId) {
    return userId;
  }
  
  // Legacy fallback: Check Authorization header directly
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ No Authorization header found');
    return null;
  }

  const token = authHeader.slice(7);
  
  // Validate token with Supabase
  try {
    // 🔒 CRITICAL: Must use SERVICE_ROLE_KEY to validate JWT tokens
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user || !user.id) {
      console.error('❌ Failed to get user from token:', error?.message || 'No user ID');
      return null;
    }
    
    return user.id;
  } catch (error: any) {
    console.error('❌ Error decoding token:', error.message);
    return null;
  }
}

/**
 * Get key prefix based on userId (SECURE!)
 * Format: user:{userId}:{resource}:
 * 
 * This ensures COMPLETE data isolation between users!
 */
async function getKeyPrefix(c: any, basePrefix: string): Promise<string | null> {
  const userId = await getUserIdFromAuth(c);
  
  if (!userId) {
    // 🚨 CRITICAL SECURITY: Deny access immediately!
    console.error('❌ SECURITY: No userId found, denying access');
    return null; // Signal that access should be denied
  }
  
  // ✅ Return user-specific prefix
  return `user:${userId}:${basePrefix}`;
}

// ===== 🔒 USER ISOLATION HELPERS =====
/**
 * 🔒 CRITICAL: Require valid user prefix (enforces per-user isolation)
 * Returns prefix or throws UNAUTHORIZED error
 */
const requirePrefix = async (c: any, ns: string): Promise<string> => {
  const prefix = await getKeyPrefix(c, ns);
  if (!prefix) {
    throw new Error("UNAUTHORIZED");
  }
  return prefix;
};

/**
 * 🔒 CRITICAL: Route handler wrapper with automatic user isolation
 * All routes that touch user data MUST use this wrapper!
 * 
 * Usage: app.get("/path", handle("resource:", async (c, prefix) => { ... }))
 */
const handle = (ns: string, fn: (c: any, prefix: string) => Promise<any>) =>
  async (c: any) => {
    try {
      const prefix = await requirePrefix(c, ns);
      return await fn(c, prefix);
    } catch (e: any) {
      if (String(e?.message).includes("UNAUTHORIZED")) {
        const requestId = c.get('requestId') || 'unknown';
        console.error(`[${requestId}] 🚨 UNAUTHORIZED ACCESS ATTEMPT to namespace: ${ns}`);
        return c.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 });
      }
      console.error("Route error:", e);
      const requestId = c.get('requestId') || 'unknown';
      return c.json({ 
        error: "Internal Server Error", 
        message: e?.message || "Unknown error",
        requestId 
      }, { status: 500 });
    }
  };

// ===== 🔥 NAMESPACE CONSTANTS =====
// JWT-only namespaces (ห้ามใช้ :userId) - เพิ่ม {userId} placeholder
const NS = {
  profile: "user:{userId}:profile:",
  customer: "customer:",
  partner: "partner:",
  document: "document:",
  tax: "tax:",
  withholding: "withholding:",
  payment: "payment:",
  team: "user:{userId}:team:",
  membership: "user:{userId}:membership:",
  analytics: "analytics:",
  customTemplates: "user:{userId}:custom-templates:",
};

// ===== 🚀 SWR CACHE HELPERS (KV + TTL) =====
type CacheBox<T> = { value: T; exp: number };
const now = () => Date.now();

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const box = await kv.get<CacheBox<T>>(key);
    if (!box?.exp) return null;
    if (box.exp <= now()) return null; // expired
    return box.value;
  } catch {
    return null;
  }
}

async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const box: CacheBox<T> = { value, exp: now() + ttlMs };
    await kv.set(key, box);
  } catch (e) {
    console.warn('Cache set error:', e);
  }
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

function deleteCache(key: string): void {
  cache.delete(key);
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

// 1. CORS (MUST be first for OPTIONS handling)
app.use('*', corsMiddleware());

// 2. Request timeout (wrap all other middleware)
app.use('/make-server-6e95bca3/*', requestTimeoutMiddleware(15000)); // 15s max (increased from 10s)

// 3. Security headers (HSTS, CSP, etc.)
app.use('*', securityHeadersMiddleware());

// 4. Content-Type validation
app.use('*', contentTypeMiddleware());

// 5. Body size limits
app.use('*', bodySizeLimitMiddleware());

// 6. Rate limiting (per-IP + per-user)
app.use('/make-server-6e95bca3/*', rateLimitMiddleware());

// 7. Request logging (with PII redaction)
if (DEBUG_LOG) {
  app.use('*', requestLoggerMiddleware(console.log));
}

// 8. ETag support for /version
app.use('*', etagMiddleware());

// 🔒 9. CRITICAL: Global Authentication Middleware (MUST come after CORS but before routes)
app.use('/make-server-6e95bca3/*', globalAuthMiddleware);

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

// 🐛 DEBUG: Health check endpoint (shows env config without exposing secrets)
app.get("/make-server-6e95bca3/health", (c) => {
  const hasServiceRoleKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hasAnonKey = !!Deno.env.get('SUPABASE_ANON_KEY');
  const hasUrl = !!Deno.env.get('SUPABASE_URL');
  
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      SUPABASE_URL: hasUrl ? 'set' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey ? 'set' : 'missing',
      SUPABASE_ANON_KEY: hasAnonKey ? 'set' : 'missing',
    },
    auth: {
      middleware: 'globalAuthMiddleware',
      tokenValidation: hasServiceRoleKey ? 'SERVICE_ROLE_KEY (correct)' : 'ERROR: SERVICE_ROLE_KEY missing',
    }
  });
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

// ========== PROFILE API ==========

// Get user profile
app.get("/make-server-6e95bca3/profile", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const userId = c.get('userId');
    
    // 🚨 SECURITY: Reject if no userId
    if (!userId) {
      console.error(`[${requestId}] 🚨 SECURITY VIOLATION: Attempted to access profile without userId`);
      return c.json({ 
        error: 'Unauthorized',
        message: 'Authentication required',
        requestId 
      }, { status: 401 });
    }
    
    const profileKey = `${userId}:profile`;
    const cacheKey = `profile:${userId}`;
    
    // ⚡ Check cache first (CRITICAL for performance!)
    const cached = getCached(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ⚡ CACHE HIT: Profile in ${duration}ms`);
      c.header('X-Cache', 'HIT');
      c.header('Cache-Control', 'private, max-age=3600'); // 1 hour
      return c.json(cached);
    }
    
    // ✅ No cache - Query database
    console.log(`[${requestId}] 📊 Cache miss - querying profile...`);
    
    try {
      const profile = await kv.get(profileKey);
      
      // If no profile exists, return default profile
      if (!profile) {
        const defaultProfile = {
          companyName: '',
          address: '',
          phone: '',
          email: c.get('userEmail') || '',
          taxId: '',
          logo: null,
          bankAccount: {
            bank: '',
            accountNumber: '',
            accountName: '',
          },
          qrCodePromptPay: null,
          signature: null,
          userId: userId,
        };
        
        // Cache default profile for 1 hour
        setCache(cacheKey, defaultProfile, 3600000);
        
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ✅ Default profile created in ${duration}ms`);
        
        c.header('X-Cache', 'MISS');
        c.header('Cache-Control', 'private, max-age=3600');
        return c.json(defaultProfile);
      }
      
      // Cache for 1 hour
      setCache(cacheKey, profile, 3600000);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ Profile loaded in ${duration}ms`);
      
      c.header('X-Cache', 'MISS');
      c.header('Cache-Control', 'private, max-age=3600');
      return c.json(profile);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ DB query failed after ${duration}ms:`, error.message);
      throw error;
    }
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Get profile failed:`, error.message);
    return c.json({ 
      error: 'Internal server error', 
      message: error.message,
      requestId 
    }, { status: 500 });
  }
});

// Update user profile
app.post("/make-server-6e95bca3/profile", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    const userId = c.get('userId');
    
    // 🚨 SECURITY: Reject if no userId
    if (!userId) {
      console.error(`[${requestId}] 🚨 SECURITY VIOLATION: Attempted to update profile without userId`);
      return c.json({ 
        error: 'Unauthorized',
        message: 'Authentication required',
        requestId 
      }, { status: 401 });
    }
    
    const body = await c.req.json();
    
    // Validate profile data
    const profileData = {
      ...body,
      userId: userId, // Ensure userId is set
      updatedAt: new Date().toISOString(),
    };
    
    const profileKey = `${userId}:profile`;
    const cacheKey = `profile:${userId}`;
    
    // Save to database
    await kv.set(profileKey, profileData);
    
    // Invalidate cache
    deleteCache(cacheKey);
    
    console.log(`[${requestId}] ✅ Profile updated for user: ${userId}`);
    
    return c.json({ 
      success: true,
      profile: profileData,
      requestId 
    });
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Update profile failed:`, error.message);
    return c.json({ 
      error: 'Internal server error', 
      message: error.message,
      requestId 
    }, { status: 500 });
  }
});

// ========== CUSTOMERS API ==========

// Get all customers
app.get("/make-server-6e95bca3/customers", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const prefix = await getKeyPrefix(c, "customer:");
    
    // 🚨 SECURITY: Reject if no userId
    if (!prefix) {
      console.error(`[${requestId}] 🚨 SECURITY VIOLATION: Attempted to access customers without userId`);
      return c.json({ 
        error: 'Unauthorized',
        message: 'Authentication required',
        requestId 
      }, { status: 401 });
    }
    
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
    
    // ✅ No cache - Query database
    console.log(`[${requestId}] 📊 Cache miss - querying customers...`);
    
    try {
      const customers = await kv.getByPrefix(prefix);
      const sorted = customers
        .filter((c: any) => c && c.id)
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      
      // Cache for 10 minutes
      setCache(cacheKey, sorted, 600000);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ DB QUERY SUCCESS: ${sorted.length} customers in ${duration}ms`);
      
      c.header('X-Cache', 'MISS');
      c.header('Cache-Control', 'private, max-age=600');
      
      return c.json({ customers: sorted });
    } catch (dbError: any) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ⚠️ DB query failed (${duration}ms):`, dbError.message);
      
      const empty: any[] = [];
      setCache(cacheKey, empty, 60000); // Cache empty for 1 minute only
      
      c.header('X-Cache', 'MISS-ERROR');
      
      return c.json({ customers: empty });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Get customers error (${duration}ms):`, error);
    return c.json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch customers',
      requestId 
    }, { status: 500 });
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
      
      const prefix = await getKeyPrefix(c, "customer:");
      if (!prefix) return c.json({ error: 'Unauthorized', requestId: c.get('requestId') }, { status: 401 });
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
    
    const prefix = await getKeyPrefix(c, "customer:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    const prefix = await getKeyPrefix(c, "customer:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Clear cache when data changes
    clearCache('customers:');
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== PROFILE API ==========

// ===== /profile — GET: immediate default (no DB), cached 5m =====
app.get("/make-server-6e95bca3/profile", handle(NS.profile, async (c, prefix) => {
  const userId = c.get("userId") as string;
  const CKEY = prefix + "cache.v1";
  
  // Check SWR cache first
  const cached = await cacheGet(CKEY);
  if (cached) {
    return c.json(cached, 200, {
      "Cache-Control": "private, max-age=60",
      "X-Cache": "HIT",
    });
  }

  // 🚨 NUCLEAR MODE: Return default ทันที (ไม่ query DB)
  const result = {
    profile: null,
    membership: {
      userId,
      tier: "free",
      freeBoqUsed: false,
      autoRenew: false,
      paymentHistory: [] as any[],
    },
  };

  // Cache 5 นาที กัน loop/hammer
  await cacheSet(CKEY, result, 5 * 60 * 1000);

  return c.json(result, 200, {
    "Cache-Control": "private, max-age=60",
    "X-Cache": "MISS-NUCLEAR",
    "X-Performance-Mode": "cache-only-default-free-plan",
  });
}));

// ===== /profile — PUT: อัปเดตจริง + bust cache =====
app.put("/make-server-6e95bca3/profile", handle(NS.profile, async (c, prefix) => {
  const body = await c.req.json();
  const userId = c.get("userId") as string;
  
  // ✅ Sanitize data
  const profileData = sanitizeObject(body);
  profileData.userId = userId;
  profileData.updatedAt = Date.now();
  if (!profileData.createdAt) {
    profileData.createdAt = Date.now();
  }
  
  // เขียนข้อมูลจริงลง KV
  await kv.set(prefix + "main", profileData);
  
  // 🔥 Bust cache
  const CKEY = prefix + "cache.v1";
  await kv.set(CKEY, { value: null, exp: 0 });
  
  // Get membership
  const membershipPrefix = await getKeyPrefix(c, NS.membership);
  const membership = membershipPrefix ? await kv.get(membershipPrefix + userId) : null;
  
  return c.json({ 
    ok: true, 
    profile: profileData,
    membership 
  });
}));

// ===== /team/members (JWT only) =====
app.get("/make-server-6e95bca3/team/members", handle(NS.team, async (c, prefix) => {
  const list = await kv.getByPrefix(prefix + "members:");
  return c.json({ items: list || [] });
}));

app.post("/make-server-6e95bca3/team/members", handle(NS.team, async (c, prefix) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const key = prefix + "members:" + id;
  await kv.set(key, { ...body, id, createdAt: Date.now() });
  return c.json({ ok: true, id });
}));

app.delete("/make-server-6e95bca3/team/members/:id", handle(NS.team, async (c, prefix) => {
  const id = c.req.param("id");
  await kv.del(prefix + "members:" + id);
  return c.json({ ok: true });
}));

// ========== DOCUMENTS API ==========

// Get all documents
app.get("/make-server-6e95bca3/documents", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  const startTime = Date.now();
  
  try {
    const recipientType = c.req.query("recipientType");
    const partnerId = c.req.query("partnerId");
    const requestedLimit = parseInt(c.req.query("limit") || "20");
    
    const prefix = await getKeyPrefix(c, "document:");
    
    // 🚨 SECURITY: Reject if no userId
    if (!prefix) {
      console.error(`[${requestId}] 🚨 SECURITY VIOLATION: Attempted to access documents without userId`);
      return c.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }
    
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
    
    // ✅ No cache - Query database with timeout protection
    console.log(`[${requestId}] 📊 Cache miss - querying database...`);
    
    try {
      const allDocuments = await kv.getByPrefix(prefix);
      let documents = allDocuments
        .filter((doc: any) => doc && doc.id)
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      
      // Apply filters
      if (recipientType) {
        documents = documents.filter((doc: any) => 
          doc.recipientType === recipientType || 
          (!doc.recipientType && recipientType === 'customer')
        );
      }
      
      if (partnerId) {
        documents = documents.filter((doc: any) => doc.partnerId === partnerId);
      }
      
      // Apply limit
      const limited = documents.slice(0, requestedLimit);
      
      // Cache for 10 minutes
      setCache(cacheKey, limited, 600000);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ DB QUERY SUCCESS: ${limited.length} documents in ${duration}ms`);
      
      c.header('X-Cache', 'MISS');
      c.header('Cache-Control', 'private, max-age=600');
      
      return c.json({ documents: limited });
    } catch (dbError: any) {
      // ⚠️ Database error fallback
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ⚠️ DB query failed (${duration}ms), returning empty:`, dbError.message);
      
      const empty: any[] = [];
      setCache(cacheKey, empty, 60000); // Cache empty for 1 minute only
      
      c.header('X-Cache', 'MISS-ERROR');
      c.header('Cache-Control', 'private, max-age=60');
      
      return c.json({ documents: empty });
    }
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
    const startTime = Date.now();
    const perfLog: Record<string, number> = {};
    
    try {
      currentContext = c; // Store context for helper functions
      const rawData = await c.req.json();
      perfLog['parse'] = Date.now() - startTime;
      
      // ✅ Validate input
      const validateStart = Date.now();
      const validation = validate(schemas.document, rawData);
      perfLog['validate'] = Date.now() - validateStart;
      
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
      const sanitizeStart = Date.now();
      let document = sanitizeObject(validation.data);
      perfLog['sanitize'] = Date.now() - sanitizeStart;
      
      const prefix = await getKeyPrefix(c, "document:");
      if (!prefix) return c.json({ error: 'Unauthorized', requestId: c.get('requestId') }, { status: 401 });
      
      // ✅ P1: Atomic document number generation
      const docNumStart = Date.now();
      let isAutoGenerated = false;
      
      if (!document.documentNumber || document.documentNumber.startsWith('DOC-')) {
        // Generate new number with atomic increment (no validation needed - guaranteed unique)
        document.documentNumber = await generateDocumentNumber({
          type: document.type,
          context: c
        });
        isAutoGenerated = true;
        perfLog['docNumber'] = Date.now() - docNumStart;
      } else {
        // ✅ P1: Validate custom document number uniqueness (only for user-provided numbers)
        const uniqueCheck = await validateDocumentNumberUnique(
          document.documentNumber,
          document.id,
          c
        );
        perfLog['docNumber'] = Date.now() - docNumStart;
        
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
      
      // Save to database (parallel writes for speed)
      const dbStart = Date.now();
      const indexKey = `${prefix.replace('document:', 'docnum_index:')}${document.documentNumber}`;
      
      // ⚡ PARALLEL WRITES: Save document and index simultaneously
      await Promise.all([
        kv.set(`${prefix}${document.id}`, document),
        kv.set(indexKey, document.id)
      ]);
      
      perfLog['dbSave'] = Date.now() - dbStart;
      
      // ⚡ FAST CACHE UPDATE: Only update specific cache keys (no iteration!)
      const cacheStart = Date.now();
      const recipientType = document.recipientType || 'customer';
      const cacheKeysToUpdate = [
        `documents:${prefix}:all:all:20`,
        `documents:${prefix}:${recipientType}:all:20`,
        `documents:${prefix}:all:all:50`,
        `documents:${prefix}:${recipientType}:all:50`,
      ];
      
      if (document.partnerId) {
        cacheKeysToUpdate.push(`documents:${prefix}:partner:${document.partnerId}:20`);
      }
      
      let cacheUpdated = 0;
      for (const cacheKey of cacheKeysToUpdate) {
        const cached = cache.get(cacheKey);
        if (cached && Array.isArray(cached.data)) {
          const cachedDocs = cached.data;
          const existingIndex = cachedDocs.findIndex((d: any) => d.id === document.id);
          
          if (existingIndex >= 0) {
            cachedDocs[existingIndex] = document;
          } else {
            cachedDocs.unshift(document);
            const limitMatch = cacheKey.match(/:(\d+)$/);
            if (limitMatch) {
              const limit = parseInt(limitMatch[1]);
              if (cachedDocs.length > limit) {
                cachedDocs.splice(limit);
              }
            }
          }
          
          cache.set(cacheKey, cached);
          cacheUpdated++;
        }
      }
      perfLog['cacheUpdate'] = Date.now() - cacheStart;
      
      // Update partner stats if this is a partner document
      const statsStart = Date.now();
      if (document.partnerId && document.recipientType === 'partner') {
        await updatePartnerStats(document.partnerId, c);
      }
      perfLog['partnerStats'] = Date.now() - statsStart;
      
      perfLog['total'] = Date.now() - startTime;
      
      // Log performance breakdown
      const requestId = c.get('requestId') || 'unknown';
      
      // Performance-based logging with hints
      if (perfLog.total > 5000) {
        console.error(`[${requestId}] ❌ CRITICAL SLOW SAVE (${perfLog.total}ms):`, {
          docNum: document.documentNumber,
          type: document.type,
          breakdown: perfLog
        });
        
        // Identify bottleneck
        const slowest = Object.entries(perfLog)
          .filter(([k]) => k !== 'total')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        if (slowest && slowest[1] > 1000) {
          console.error(`[${requestId}] 🐌 Bottleneck: ${slowest[0]} took ${slowest[1]}ms`);
        }
      } else if (perfLog.total > 2000) {
        console.warn(`[${requestId}] ⚠️ SLOW SAVE (${perfLog.total}ms):`, {
          docNum: document.documentNumber,
          breakdown: perfLog
        });
        
        // Show slowest operation
        const slowest = Object.entries(perfLog)
          .filter(([k]) => k !== 'total')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        if (slowest) {
          console.warn(`[${requestId}] 💡 Slowest: ${slowest[0]} (${slowest[1]}ms)`);
        }
      } else if (perfLog.total < 500) {
        console.log(`[${requestId}] ⚡ Lightning fast save in ${perfLog.total}ms`);
      } else {
        console.log(`[${requestId}] ✅ Document created in ${perfLog.total}ms`);
      }
      
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
    const prefix = await getKeyPrefix(c, "document:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    document.updatedAt = Date.now();
    
    // ⚡ PARALLEL WRITES: Update document and index simultaneously
    const indexKey = `${prefix.replace('document:', 'docnum_index:')}${document.documentNumber}`;
    await Promise.all([
      kv.set(`${prefix}${id}`, document),
      kv.set(indexKey, document.id)
    ]);
    
    // ⚡ FAST CACHE UPDATE
    const recipientType = document.recipientType || 'customer';
    const cacheKeysToUpdate = [
      `documents:${prefix}:all:all:20`,
      `documents:${prefix}:${recipientType}:all:20`,
      `documents:${prefix}:all:all:50`,
      `documents:${prefix}:${recipientType}:all:50`,
    ];
    
    if (document.partnerId) {
      cacheKeysToUpdate.push(`documents:${prefix}:partner:${document.partnerId}:20`);
    }
    
    let cacheUpdated = 0;
    for (const cacheKey of cacheKeysToUpdate) {
      const cached = cache.get(cacheKey);
      if (cached && Array.isArray(cached.data)) {
        const existingIndex = cached.data.findIndex((d: any) => d.id === document.id);
        if (existingIndex >= 0) {
          cached.data[existingIndex] = document;
          cache.set(cacheKey, cached);
          cacheUpdated++;
        }
      }
    }
    
    if (DEBUG_LOG && cacheUpdated > 0) console.log(`📦 Updated ${cacheUpdated} cache entries for document ${id}`);
    
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
    const prefix = await getKeyPrefix(c, "document:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    const prefix = await getKeyPrefix(c, "document:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Get document before deleting to update partner stats
    const document: any = await kv.get(`${prefix}${id}`);
    
    if (!document) {
      return c.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Delete the document
    await kv.del(`${prefix}${id}`);
    
    // ⚡ Delete document number index
    const indexKey = `${prefix.replace('document:', 'docnum_index:')}${document.documentNumber}`;
    await kv.del(indexKey);
    
    // ⚡ FAST CACHE UPDATE (remove from caches)
    const recipientType = document.recipientType || 'customer';
    const cacheKeysToUpdate = [
      `documents:${prefix}:all:all:20`,
      `documents:${prefix}:${recipientType}:all:20`,
      `documents:${prefix}:all:all:50`,
      `documents:${prefix}:${recipientType}:all:50`,
    ];
    
    if (document.partnerId) {
      cacheKeysToUpdate.push(`documents:${prefix}:partner:${document.partnerId}:20`);
    }
    
    let cacheUpdated = 0;
    for (const cacheKey of cacheKeysToUpdate) {
      const cached = cache.get(cacheKey);
      if (cached && Array.isArray(cached.data)) {
        cached.data = cached.data.filter((d: any) => d.id !== id);
        cache.set(cacheKey, cached);
        cacheUpdated++;
      }
    }
    
    if (DEBUG_LOG && cacheUpdated > 0) console.log(`�� Removed document ${id} from ${cacheUpdated} cache entries`);
    
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
// All profile endpoints now use JWT-only authentication (no :userId params)

// Update user profile - POST (for backward compatibility)
app.post("/make-server-6e95bca3/profile", async (c) => {
  try {
    const profile = await c.req.json();
    const prefix = await getKeyPrefix(c, "profile:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    await kv.set(`${prefix}${profile.id}`, profile);
    
    // ⚡ Clear cache when data changes
    clearCache('profile:');
    
    return c.json({ success: true, profile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ❌ DUPLICATE ENDPOINT REMOVED - Using the one at line ~3029

// ========== TEAM MANAGEMENT API ==========

// Send team invitation
app.post("/make-server-6e95bca3/team/invite", async (c) => {
  try {
    const { ownerId, email, name } = await c.req.json();
    const prefix = await getKeyPrefix(c, "team:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
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
    const prefix = await getKeyPrefix(c, "team:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
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
    const prefix = await getKeyPrefix(c, "team:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
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
    const prefix = await getKeyPrefix(c, "partner:");
    if (!prefix) {
      console.error(`[${requestId}] 🚨 SECURITY VIOLATION: Attempted to access partners without userId`);
      return c.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }
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
    
    // ✅ No cache - Query database
    console.log(`[${requestId}] 📊 Cache miss - querying partners...`);
    
    try {
      const partners = await kv.getByPrefix(prefix);
      const sorted = partners
        .filter((p: any) => p && p.id)
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      
      // Cache for 10 minutes
      setCache(cacheKey, sorted, 600000);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ DB QUERY SUCCESS: ${sorted.length} partners in ${duration}ms`);
      
      c.header('X-Cache', 'MISS');
      c.header('Cache-Control', 'private, max-age=600');
      c.header('X-Partners-Count', sorted.length.toString());
      
      return c.json({ partners: sorted });
    } catch (dbError: any) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ⚠️ DB query failed (${duration}ms):`, dbError.message);
      
      const empty: any[] = [];
      setCache(cacheKey, empty, 60000);
      
      c.header('X-Cache', 'MISS-ERROR');
      c.header('X-Partners-Count', '0');
      
      return c.json({ partners: empty });
    }
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
      
      const prefix = await getKeyPrefix(c, "partner:");
      if (!prefix) return c.json({ error: 'Unauthorized', requestId: c.get('requestId') }, { status: 401 });
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
    
    const prefix = await getKeyPrefix(c, "partner:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    const prefix = await getKeyPrefix(c, "partner:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    const prefix = await getKeyPrefix(c, "tax-record:");
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
      
      const prefix = await getKeyPrefix(c, "tax-record:");
      if (!prefix) return c.json({ error: 'Unauthorized', requestId: c.get('requestId') }, { status: 401 });
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
    const prefix = await getKeyPrefix(c, "tax-record:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    const prefix = await getKeyPrefix(c, "tax-record:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    await kv.del(`${prefix}${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete tax record error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// ========== CUSTOM TEMPLATES API ==========

// Get all custom templates for current user
app.get("/make-server-6e95bca3/custom-templates", handle(NS.customTemplates, async (c, prefix) => {
  try {
    const templates = await kv.getByPrefix(prefix);
    
    // Sort by updatedAt descending (newest first)
    const sorted = (templates || []).sort((a: any, b: any) => 
      (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    
    if (DEBUG_LOG) {
      console.log(`✅ GET custom-templates: ${sorted.length} templates`);
    }
    
    return c.json(sorted);
  } catch (error: any) {
    console.error("❌ GET custom-templates error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
}));

// Create new custom template
app.post("/make-server-6e95bca3/custom-templates", handle(NS.customTemplates, async (c, prefix) => {
  try {
    const body = await c.req.json();
    const userId = c.get("userId") as string;
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const template = {
      id,
      userId,
      ...body,
      createdAt: now,
      updatedAt: now,
      isCustom: true,
    };
    
    await kv.set(prefix + id, template);
    
    if (DEBUG_LOG) {
      console.log(`✅ POST custom-template created: ${id} - "${template.name}"`);
    }
    
    return c.json(template);
  } catch (error: any) {
    console.error("❌ POST custom-template error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
}));

// Update custom template
app.put("/make-server-6e95bca3/custom-templates/:id", handle(NS.customTemplates, async (c, prefix) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Get existing template
    const existing = await kv.get(prefix + id);
    
    if (!existing) {
      return c.json({ error: "Template not found" }, { status: 404 });
    }
    
    // Update template (preserve createdAt and items)
    const updated = {
      ...existing,
      ...body,
      id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: Date.now(),
      isCustom: true,
    };
    
    await kv.set(prefix + id, updated);
    
    if (DEBUG_LOG) {
      console.log(`✅ PUT custom-template updated: ${id} - "${updated.name}"`);
    }
    
    return c.json(updated);
  } catch (error: any) {
    console.error("❌ PUT custom-template error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
}));

// Delete custom template
app.delete("/make-server-6e95bca3/custom-templates/:id", handle(NS.customTemplates, async (c, prefix) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(prefix + id);
    
    if (DEBUG_LOG) {
      console.log(`✅ DELETE custom-template: ${id}`);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("❌ DELETE custom-template error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
}));

// ========== MEMBERSHIP API ==========

// Update membership
app.post("/make-server-6e95bca3/membership", async (c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  try {
    const body = await c.req.json();
    const { membership, affiliate } = body;
    
    const prefix = await getKeyPrefix(c, "membership:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    await kv.set(`${prefix}${membership.userId}`, membership);
    
    // If affiliate code was used, update usage count and track commission
    if (affiliate && affiliate.code) {
      try {
        const affiliatePrefix = await getKeyPrefix(c, 'affiliate');
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

// ===== /membership (JWT only) =====
app.get("/make-server-6e95bca3/membership", handle(NS.membership, async (c, prefix) => {
  const data = await kv.get(prefix + "main");
  return c.json(data ?? { tier: "free", freeBoqUsed: false, autoRenew: false, paymentHistory: [] });
}));

app.put("/make-server-6e95bca3/membership", handle(NS.membership, async (c, prefix) => {
  const body = await c.req.json();
  await kv.set(prefix + "main", body);
  return c.json({ ok: true });
}));

// ใช้สิทธิ์ฟรี 1 ครั้ง — idempotent
app.post("/make-server-6e95bca3/membership/use-free", handle(NS.membership, async (c, prefix) => {
  const idem = c.req.header("Idempotency-Key") ?? "";
  const idemKey = prefix + "idem:" + idem;
  if (idem && await kv.get(idemKey)) return c.json({ ok: true, reused: true });

  const mKey = prefix + "main";
  const m = (await kv.get(mKey)) ?? { tier: "free", freeBoqUsed: false, autoRenew: false, paymentHistory: [] };
  if (m.freeBoqUsed) return c.json({ ok: true, alreadyUsed: true });

  m.freeBoqUsed = true;
  await kv.set(mKey, m);
  if (idem) await kv.set(idemKey, { usedAt: Date.now() });
  return c.json({ ok: true, status: "used" });
}));

// ========== QUICK ACTIONS API ==========

// Create new BOQ quickly
app.post("/make-server-6e95bca3/quick-actions/new-boq", async (c) => {
  try {
    const { userId, customerId } = await c.req.json();
    const prefix = await getKeyPrefix(c, "membership:");
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
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
        message: "สมาชิกของคุณหมดอายุแล้ว กรุณาต่ออายุสมา��ิก"
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
    const customerPrefix = await getKeyPrefix(c, "customer:");
    const documentPrefix = await getKeyPrefix(c, "document:");
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
    
    // 🔥 Calculate from cached documents
    console.log(`[${requestId}] 📊 Analytics cache miss - calculating from documents...`);
    
    // Get documents from cache
    const documentsCache = cache.get(`documents:${documentPrefix}:all:all:50`);
    const documents = documentsCache?.data || [];
    
    // Get customers from cache
    const customersCache = cache.get(`customers:${customerPrefix}:all`);
    const customers = customersCache?.data || [];
    
    // Calculate analytics
    const analyticsData = calculateAnalytics(documents, customers);
    
    // Cache for 5 minutes
    setCache(cacheKey, analyticsData, 300000);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Analytics calculated in ${duration}ms`);
    
    c.header('X-Cache', 'MISS');
    c.header('Cache-Control', 'private, max-age=300');
    
    return c.json(analyticsData);
    
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
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'withholding-tax:');
    if (!prefix) {
      console.error('🚨 SECURITY: Attempted to access withholding taxes without userId');
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const withholdingTaxes = await kv.getByPrefix(prefix);
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
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'withholding-tax:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const withholdingTax = await c.req.json();
    await kv.set(`${prefix}${withholdingTax.id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Create withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update withholding tax
app.put("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'withholding-tax:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const id = c.req.param("id");
    const withholdingTax = await c.req.json();
    withholdingTax.updatedAt = Date.now();
    await kv.set(`${prefix}${id}`, withholdingTax);
    return c.json({ success: true, withholdingTax });
  } catch (error: any) {
    console.error("Update withholding tax error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete withholding tax
app.delete("/make-server-6e95bca3/withholding-taxes/:id", async (c) => {
  try {
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'withholding-tax:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const id = c.req.param("id");
    await kv.del(`${prefix}${id}`);
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
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'partner-payment:');
    if (!prefix) {
      console.error('🚨 SECURITY: Attempted to access partner payments without userId');
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const partnerPayments = await kv.getByPrefix(prefix);
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
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'partner-payment:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const partnerPayment = await c.req.json();
    await kv.set(`${prefix}${partnerPayment.id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Create partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Update partner payment
app.put("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'partner-payment:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const id = c.req.param("id");
    const partnerPayment = await c.req.json();
    partnerPayment.updatedAt = Date.now();
    await kv.set(`${prefix}${id}`, partnerPayment);
    return c.json({ success: true, partnerPayment });
  } catch (error: any) {
    console.error("Update partner payment error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});

// Delete partner payment
app.delete("/make-server-6e95bca3/partner-payments/:id", async (c) => {
  try {
    // 🔒 SECURITY: Get user-specific prefix
    const prefix = await getKeyPrefix(c, 'partner-payment:');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    
    const id = c.req.param("id");
    await kv.del(`${prefix}${id}`);
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
        message: 'กรุณาติ���ต่อผู้ดูแลระบบ' 
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
        message: 'กรุณาระบุรห���สส่วนลด' 
      }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    
    // Get affiliate code from KV store
    const prefix = await getKeyPrefix(c, 'affiliate');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
    const affiliateKey = `${prefix}:${normalizedCode}`;
    
    const affiliateData = await kv.get(affiliateKey);

    if (!affiliateData) {
      return c.json({ 
        success: false,
        message: 'รหัสไม่ถูกต้องหรือ���ม่มีอยู่ในระบบ' 
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
        message: 'ส่วนลดต้องอยู่ร���หว่าง 1-100%' 
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

    const prefix = await getKeyPrefix(c, 'affiliate');
    if (!prefix) return c.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.log('🔵 GET /tax-records - Start');
    const prefix = await getKeyPrefix(c, "tax-record:");
    console.log('🔵 Using prefix:', prefix);
    
    // 🚨 SECURITY: Return empty if no valid user
    if (prefix.startsWith('__no_user__')) {
      console.warn('⚠️ No valid user - returning empty tax records');
      c.header('X-Cache', 'NO-USER');
      return c.json({ taxRecords: [] });
    }
    
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
    console.error(`[${requestId}] ❌ Error stack:`, error.stack);
    return c.json({ taxRecords: [] }, { status: 200 });
  }
});

// Create tax record (with idempotency)
app.post("/make-server-6e95bca3/tax-records", async (c) => {
  return await handleIdempotency(c, async () => {
    try {
      console.log('🔵 POST /tax-records - Start');
      const taxRecord = await c.req.json();
      console.log('🔵 Tax record data received:', { id: taxRecord.id });
      
      const prefix = await getKeyPrefix(c, "tax-record:");
      console.log('🔵 Using prefix:', prefix);
      
      // 🚨 SECURITY: Deny if no valid user
      if (prefix.startsWith('__no_user__')) {
        console.error('❌ SECURITY: Attempted to create tax record without valid user');
        return c.json({ 
          error: 'Authentication required',
          message: 'Please log in to save tax records'
        }, { status: 401 });
      }
      
      await kv.set(`${prefix}${taxRecord.id}`, taxRecord);
      console.log('🔵 Tax record saved to KV store');
      
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
      
      console.log(`✅ Tax record created successfully: ${taxRecord.id}`);
      
      return c.json({ success: true, taxRecord });
    } catch (error: any) {
      console.error("❌ Create tax record error:", error);
      console.error("❌ Error stack:", error.stack);
      return c.json({ 
        error: error.message,
        details: error.stack 
      }, { status: 500 });
    }
  });
});

// Update tax record
app.put("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    console.log('🔵 PUT /tax-records/:id - Start');
    const id = c.req.param("id");
    const taxRecord = await c.req.json();
    console.log('🔵 Tax record data received:', { id });
    
    const prefix = await getKeyPrefix(c, "tax-record:");
    console.log('🔵 Using prefix:', prefix);
    
    // 🚨 SECURITY: Deny if no valid user
    if (prefix.startsWith('__no_user__')) {
      console.error('❌ SECURITY: Attempted to update tax record without valid user');
      return c.json({ 
        error: 'Authentication required',
        message: 'Please log in to update tax records'
      }, { status: 401 });
    }
    
    await kv.set(`${prefix}${id}`, taxRecord);
    console.log('🔵 Tax record saved to KV store');
    
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
    
    console.log(`✅ Tax record updated successfully: ${id}`);
    
    return c.json({ success: true, taxRecord });
  } catch (error: any) {
    console.error("❌ Update tax record error:", error);
    console.error("❌ Error stack:", error.stack);
    return c.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});

// Delete tax record
app.delete("/make-server-6e95bca3/tax-records/:id", async (c) => {
  try {
    console.log('🔵 DELETE /tax-records/:id - Start');
    const id = c.req.param("id");
    console.log('🔵 Deleting tax record:', { id });
    
    const prefix = await getKeyPrefix(c, "tax-record:");
    console.log('🔵 Using prefix:', prefix);
    
    // 🚨 SECURITY: Deny if no valid user
    if (prefix.startsWith('__no_user__')) {
      console.error('❌ SECURITY: Attempted to delete tax record without valid user');
      return c.json({ 
        error: 'Authentication required',
        message: 'Please log in to delete tax records'
      }, { status: 401 });
    }
    
    await kv.del(`${prefix}${id}`);
    console.log('🔵 Tax record deleted from KV store');
    
    // ⚡ Update cache immediately instead of just clearing
    const cacheKey = `tax-records:${prefix}`;
    const existingCache = getCached(cacheKey);
    if (existingCache && Array.isArray(existingCache)) {
      // Remove deleted tax record from cache
      const updatedCache = existingCache.filter((t: any) => t.id !== id);
      setCache(cacheKey, updatedCache, 300000); // 5 minutes
      if (DEBUG_LOG) console.log(`✅ Cache updated - removed tax record: ${id}`);
    }
    
    console.log(`✅ Tax record deleted successfully: ${id}`);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete tax record error:", error);
    console.error("❌ Error stack:", error.stack);
    return c.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});

// ========== PROFILE & MEMBERSHIP API ==========
// (All routes now use JWT-only authentication)

// ========== GLOBAL ERROR HANDLER ==========
app.onError((err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  console.error(`[${requestId}] 🔥 GLOBAL ERROR HANDLER:`, {
    error: err.message,
    stack: err.stack,
    method: c.req.method,
    url: c.req.url,
  });
  
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    requestId,
  }, 500);
});

// ========== 404 HANDLER ==========
app.notFound((c) => {
  const requestId = c.get('requestId') || 'unknown';
  console.warn(`[${requestId}] ⚠️ 404 Not Found:`, {
    method: c.req.method,
    url: c.req.url,
  });
  
  return c.json({
    error: 'Not Found',
    message: `Endpoint not found: ${c.req.method} ${c.req.url}`,
    requestId,
  }, 404);
});

console.log('🚀 Starting server...');
console.log('📝 Endpoints registered (JWT-only):');
// ===== CUSTOM TEMPLATES ENDPOINTS =====

// GET /custom-templates - Get user's custom templates
app.get("/make-server-6e95bca3/custom-templates", handle(NS.customTemplates, async (c, prefix) => {
  const userId = c.get("userId") as string;
  const CKEY = prefix + "list.v1";
  
  // Try cache first
  let templates = await kv.get<any[]>(CKEY);
  if (templates) {
    return c.json(templates);
  }
  
  // Load from DB
  const dbKey = prefix + "all";
  templates = await kv.get<any[]>(dbKey) || [];
  
  // Cache for 5 minutes
  await kv.set(CKEY, templates, { ttl: 300 });
  
  return c.json(templates);
}));

// POST /custom-templates - Create new custom template
app.post("/make-server-6e95bca3/custom-templates", handle(NS.customTemplates, async (c, prefix) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  
  // Validate required fields
  if (!body.name || !body.items || !Array.isArray(body.items)) {
    return c.json({ error: 'Invalid template data' }, 400);
  }
  
  const now = Date.now();
  const templateId = `tpl_${userId}_${now}`;
  
  const newTemplate = {
    id: templateId,
    userId,
    name: body.name,
    description: body.description || '',
    mainCategory: body.mainCategory || 'house',
    items: body.items,
    tags: body.tags || ['custom'],
    difficulty: body.difficulty || 'medium',
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  
  // Load existing templates
  const dbKey = prefix + "all";
  const templates = await kv.get<any[]>(dbKey) || [];
  
  // Add new template
  templates.unshift(newTemplate);
  
  // Save to DB
  await kv.set(dbKey, templates);
  
  // Clear cache
  await kv.del(prefix + "list.v1");
  
  return c.json(newTemplate, 201);
}));

// PUT /custom-templates/:id - Update custom template
app.put("/make-server-6e95bca3/custom-templates/:id", handle(NS.customTemplates, async (c, prefix) => {
  const userId = c.get("userId") as string;
  const templateId = c.req.param("id");
  const body = await c.req.json();
  
  // Load templates
  const dbKey = prefix + "all";
  const templates = await kv.get<any[]>(dbKey) || [];
  
  // Find template
  const templateIndex = templates.findIndex((t: any) => t.id === templateId && t.userId === userId);
  
  if (templateIndex === -1) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  // Update template
  templates[templateIndex] = {
    ...templates[templateIndex],
    name: body.name || templates[templateIndex].name,
    description: body.description !== undefined ? body.description : templates[templateIndex].description,
    mainCategory: body.mainCategory || templates[templateIndex].mainCategory,
    updatedAt: Date.now(),
  };
  
  // Save to DB
  await kv.set(dbKey, templates);
  
  // Clear cache
  await kv.del(prefix + "list.v1");
  
  return c.json(templates[templateIndex]);
}));

// DELETE /custom-templates/:id - Delete custom template
app.delete("/make-server-6e95bca3/custom-templates/:id", handle(NS.customTemplates, async (c, prefix) => {
  const userId = c.get("userId") as string;
  const templateId = c.req.param("id");
  
  // Load templates
  const dbKey = prefix + "all";
  const templates = await kv.get<any[]>(dbKey) || [];
  
  // Filter out the template to delete
  const filtered = templates.filter((t: any) => !(t.id === templateId && t.userId === userId));
  
  if (filtered.length === templates.length) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  // Save to DB
  await kv.set(dbKey, filtered);
  
  // Clear cache
  await kv.del(prefix + "list.v1");
  
  return c.json({ success: true });
}));

console.log('  - GET /make-server-6e95bca3/health');
console.log('  - GET /make-server-6e95bca3/readyz');
console.log('  - GET /make-server-6e95bca3/profile (JWT-only)');
console.log('  - PUT /make-server-6e95bca3/profile (JWT-only)');
console.log('  - GET /make-server-6e95bca3/membership (JWT-only)');
console.log('  - GET /make-server-6e95bca3/team/members (JWT-only)');
console.log('  - GET /make-server-6e95bca3/custom-templates (JWT-only)');
console.log('  - POST /make-server-6e95bca3/custom-templates (JWT-only)');
console.log('  - PUT /make-server-6e95bca3/custom-templates/:id (JWT-only)');
console.log('  - DELETE /make-server-6e95bca3/custom-templates/:id (JWT-only)');
console.log('  ... and more');

Deno.serve(app.fetch);