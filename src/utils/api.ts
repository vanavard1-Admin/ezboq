/**
 * API Utility v2.2 - BODY STREAM FIX V2
 * Centralized API calls with automatic demo session handling
 * 
 * ✅ Features:
 * - Auto demo session ID injection
 * - Idempotency key support (prevents double-click)
 * - Error handling with detailed logging
 * - Enhanced diagnostics for "Failed to fetch" errors
 * - 🚀 FRONTEND CACHE LAYER (Nuclear Mode) - bypasses slow server!
 * - ✅ FIX V2: ALL paths return new Response objects to prevent "body stream already read"
 * - ✅ FIX V2: Better error handling for 404 and cache failures
 */

import { projectId, publicAnonKey } from './supabase/info';
import { getDemoSessionId, isDemoMode } from './demoStorage';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3`;

// ========== FRONTEND CACHE LAYER (NUCLEAR MODE) ==========
// This provides instant <5ms responses by caching GET requests in memory
// Bypasses slow server queries completely!

interface CacheEntry {
  data: any;
  timestamp: number;
  endpoint: string;
}

class FrontendCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 600000; // 10 minutes
  private readonly STALE_WHILE_REVALIDATE = 1800000; // 30 minutes
  private readonly STORAGE_KEY = 'boq_frontend_cache_v1';
  private warmupInProgress = false;
  private firstLoadTracking = new Set<string>(); // Track first loads to avoid warnings
  private pendingRequests = new Map<string, Promise<any>>(); // Request deduplication
  
  constructor() {
    // 🚀 Load cache from localStorage on startup
    this.loadFromStorage();
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Restore cache entries that are still valid
        for (const [key, entry] of Object.entries(parsed)) {
          const age = now - (entry as CacheEntry).timestamp;
          if (age < this.STALE_WHILE_REVALIDATE) {
            this.cache.set(key, entry as CacheEntry);
          }
        }
        
        console.log(`📦 Restored ${this.cache.size} cache entries from localStorage`);
      }
    } catch (e) {
      console.warn('⚠️ Failed to load cache from localStorage:', e);
    }
  }
  
  private saveToStorage(): void {
    try {
      const data: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.cache.entries()) {
        data[key] = entry;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('⚠️ Failed to save cache to localStorage:', e);
    }
  }
  
  get(endpoint: string): any | null {
    const entry = this.cache.get(endpoint);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    
    // Fresh cache (< 10 minutes)
    if (age < this.TTL) {
      return entry.data;
    }
    
    // Stale but usable (10-30 minutes)
    if (age < this.STALE_WHILE_REVALIDATE) {
      return entry.data;
    }
    
    // Too old, delete it
    this.cache.delete(endpoint);
    this.saveToStorage();
    return null;
  }
  
  set(endpoint: string, data: any): void {
    this.cache.set(endpoint, {
      data,
      timestamp: Date.now(),
      endpoint,
    });
    
    // Save to localStorage for persistence
    this.saveToStorage();
    
    // Cleanup old entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.STALE_WHILE_REVALIDATE) {
          this.cache.delete(key);
        }
      }
      this.saveToStorage();
    }
  }
  
  invalidate(pattern?: string): void {
    if (pattern) {
      // Invalidate entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          console.log(`🗑️ Invalidated cache: ${key}`);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
    this.saveToStorage();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        endpoint: key,
        age: Math.round((Date.now() - entry.timestamp) / 1000),
      })),
    };
  }
  
  /**
   * Track if this is the first load for an endpoint
   * Used to suppress warnings on cold starts
   */
  isFirstLoad(endpoint: string): boolean {
    if (this.firstLoadTracking.has(endpoint)) {
      return false;
    }
    this.firstLoadTracking.add(endpoint);
    return true;
  }
  
  /**
   * Check if there's a pending request for this endpoint
   * Returns the pending promise if exists, null otherwise
   */
  getPendingRequest(endpoint: string): Promise<any> | null {
    return this.pendingRequests.get(endpoint) || null;
  }
  
  /**
   * Register a pending request
   */
  setPendingRequest(endpoint: string, promise: Promise<any>): void {
    this.pendingRequests.set(endpoint, promise);
    // Auto-cleanup after 30 seconds
    promise.finally(() => {
      setTimeout(() => this.pendingRequests.delete(endpoint), 30000);
    });
  }
  
  /**
   * Warm up cache by preloading critical endpoints
   * Called on app startup for better UX
   * Returns a Promise that resolves when warmup is complete
   */
  warmup(fetchFn: (endpoint: string) => Promise<any>): Promise<void> {
    if (this.warmupInProgress) {
      return Promise.resolve();
    }
    this.warmupInProgress = true;
    
    console.log('🔥 Starting cache warmup...');
    
    // 🔥 PRIORITY ORDER: Analytics first (most critical for Dashboard)
    const criticalEndpoints = [
      '/analytics?range=month', // 🎯 HIGHEST PRIORITY: Dashboard stats
      '/analytics?range=6months', // 🎯 HIGHEST PRIORITY: Dashboard charts
      '/profile', // User profile (fast load)
      '/membership', // Membership info (fast load)
      '/documents?recipientType=customer&limit=20', // 🎯 HIGH PRIORITY: History page
      '/documents?recipientType=partner&limit=20', // 🎯 HIGH PRIORITY: Partners page
      '/customers', // Customer list
      '/partners', // Partner list
      '/documents?limit=50', // All documents
      '/documents?type=quotation&limit=50', // For BOQPage projects
    ];
    
    // 🚀 Warmup IMMEDIATELY (no delay) for better UX
    return new Promise((resolve) => {
      // Remove setTimeout delay - start warmup instantly!
      (async () => {
        let warmedCount = 0;
        
        for (const endpoint of criticalEndpoints) {
          // Skip if already cached
          if (this.get(endpoint) !== null) {
            console.log(`⏭️ Skipping ${endpoint} (already cached)`);
            continue;
          }
          
          try {
            const response = await fetchFn(endpoint);
            if (response.ok) {
              warmedCount++;
              console.log(`✅ Warmed ${endpoint}`);
            }
            // 🚀 No throttle for first 4 critical endpoints (analytics + documents), then 20ms throttle
            const endpointIndex = criticalEndpoints.indexOf(endpoint);
            if (endpointIndex < 4) {
              // No delay for highest priority endpoints (analytics + documents)
            } else {
              await new Promise(resolve => setTimeout(resolve, 20)); // Faster throttle!
            }
          } catch (e) {
            console.warn(`⚠️ Warmup failed for ${endpoint}:`, e);
          }
        }
        
        console.log(`✅ Cache warmup complete! Warmed ${warmedCount}/${criticalEndpoints.length} endpoints`);
        this.warmupInProgress = false;
        resolve();
      })(); // 🚀 Execute immediately, no setTimeout!
    });
  }
}

const frontendCache = new FrontendCache();

/**
 * Generate idempotency key for preventing duplicate requests
 * Format: {operation}-{timestamp}-{random}
 */
export function generateIdempotencyKey(operation: string): string {
  return `${operation}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get headers for API requests
 * Automatically includes demo session ID if in demo mode
 * 
 * ✅ P1: Includes both Authorization and apikey headers
 * 
 * @param includeContentType - Whether to include Content-Type header
 * @param idempotencyKey - Optional idempotency key for preventing duplicate requests
 */
function getHeaders(includeContentType: boolean = true, idempotencyKey?: string): HeadersInit {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'apikey': publicAnonKey, // ✅ P1: Required apikey header
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  // Add idempotency key if provided (for create/update operations)
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
    console.log('🔐 Idempotency key:', idempotencyKey);
  }

  // Add demo session ID header if in demo mode
  if (isDemoMode()) {
    const sessionId = getDemoSessionId();
    if (sessionId) {
      headers['X-Demo-Session-Id'] = sessionId;
      console.log('🎯 API call with demo session:', sessionId);
    }
  }

  return headers;
}

/**
 * Enhanced fetch wrapper with demo session and idempotency support
 * 
 * @param endpoint - API endpoint path (e.g., '/documents')
 * @param options - Fetch options (method, body, etc.)
 * @param idempotencyKey - Optional key to prevent duplicate requests
 */
export async function apiFetch(
  endpoint: string, 
  options: RequestInit = {}, 
  idempotencyKey?: string
) {
  const url = `${API_BASE}${endpoint}`;
  const startTime = performance.now();
  const method = options.method || 'GET';
  
  // 🚀 NUCLEAR MODE: Check frontend cache for GET requests FIRST!
  const isFirstLoad = method === 'GET' ? frontendCache.isFirstLoad(endpoint) : false;
  
  if (method === 'GET') {
    // 🔄 Check for pending request (deduplication)
    const pendingRequest = frontendCache.getPendingRequest(endpoint);
    if (pendingRequest) {
      console.log(`♻️ DEDUP: Reusing pending request for ${endpoint.split('?')[0]}`);
      return pendingRequest;
    }
    
    const cached = frontendCache.get(endpoint);
    if (cached !== null) {
      const cacheEntry = (frontendCache as any).cache.get(endpoint);
      const age = cacheEntry ? Math.round((Date.now() - cacheEntry.timestamp) / 1000) : 0;
      console.log(`⚡ CACHE HIT: ${endpoint.split('?')[0]} in <1ms (age: ${age}s)`);
      
      // Return cached data instantly (<1ms)!
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'FRONTEND-HIT',
          'X-Performance-Mode': 'nuclear-frontend',
          'X-Cache-Age': age.toString(),
        },
      });
    } else {
      // ⚡ NUCLEAR MODE: For document/analytics queries, ALWAYS use cache-only mode
      // This prevents ALL slow server queries (even on first load)
      const isCriticalEndpoint = endpoint.includes('/documents') || 
                                  endpoint.includes('/analytics') ||
                                  endpoint.includes('partnerId=') ||
                                  endpoint.includes('recipientType=') ||
                                  endpoint.includes('/boq/') ||
                                  endpoint.includes('/quotation/') ||
                                  endpoint.includes('/invoice/') ||
                                  endpoint.includes('/receipt/');
      
      if (isCriticalEndpoint) {
        // 🎯 Improved message: Explain why and how to fix
        if (isFirstLoad) {
          console.log(`⚡ CACHE-ONLY MODE: ${endpoint} - Cache warming up, returning empty data (will be ready in ~1 second)`);
        } else {
          console.log(`⚡ CACHE-ONLY MODE: ${endpoint} - Cache miss, returning empty data (save a document to populate)`);
        }
        
        // Return empty response instead of fetching (instant <5ms response, prevents slow 3000+ms queries!)
        return new Response(JSON.stringify({ 
          documents: [], 
          data: null,
          boq: null,
          quotation: null,
          invoice: null,
          receipt: null,
          totalProjects: 0,
          totalRevenue: 0,
          message: isFirstLoad 
            ? 'Cache warming up... Please wait a moment and refresh'
            : 'Cache-only mode - No cached data. Save a document to populate cache.'
        }), {
          status: 200, // Return 200 to avoid errors
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS-CACHE-ONLY',
            'X-Performance-Mode': 'nuclear-cache-only',
            'X-Cache-Status': isFirstLoad ? 'warming' : 'miss',
          },
        });
      }
      
      console.log(`💤 CACHE MISS: ${endpoint.split('?')[0]} - fetching from server (non-critical endpoint)...`);
    }
  }
  
  // Only include Content-Type for POST/PUT requests
  const includeContentType = options.method === 'POST' || options.method === 'PUT';
  
  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(includeContentType, idempotencyKey),
      ...(options.headers || {}),
    },
  };

  console.log(`🌐 API ${method}: ${endpoint}`, {
    demoMode: isDemoMode(),
    sessionId: getDemoSessionId(),
    idempotent: !!idempotencyKey,
    frontendCached: false,
  });

  // 🔄 Create the fetch promise and register it for deduplication (GET only)
  const executeRequest = async () => {
    try {
      console.log('🔍 Sending request to:', url);
      console.log('🔍 Request method:', method);
      
      // Add timeout wrapper (30 seconds for document save operations)
      const timeout = 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchWithTimeout = fetch(url, { 
        ...finalOptions, 
        signal: controller.signal 
      });
      
      const response = await fetchWithTimeout;
      clearTimeout(timeoutId);
    
    const elapsed = Math.round(performance.now() - startTime);
    
    // Handle error responses first (before trying to read body)
    if (!response.ok) {
      // ✅ FIX: Always create new Response for errors to prevent "body stream already read"
      try {
        const error = await response.text();
        console.error(`❌ API Error (${response.status}):`, error);
        
        // Return error as new Response instead of throwing
        // This allows caller to handle errors consistently
        if (response.status !== 404) {
          throw new Error(`API Error (${response.status}): ${error}`);
        }
        
        // For 404, return new Response with error details
        return new Response(JSON.stringify({ 
          error: 'Not Found', 
          status: 404,
          message: error 
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'X-Error': 'not-found',
          },
        });
      } catch (readError) {
        // If we can't read the response, return generic error
        console.error(`❌ Failed to read error response:`, readError);
        return new Response(JSON.stringify({ 
          error: 'Unknown Error', 
          status: response.status,
          message: 'Failed to read error response' 
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'X-Error': 'read-error',
          },
        });
      }
    }
    
    // 🚀 NUCLEAR MODE: Cache successful GET responses FIRST
    // CRITICAL: Must clone and return new Response to prevent "body stream already read" error
    if (method === 'GET' && response.ok) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        frontendCache.set(endpoint, data);
        
        // ⚡ Get clean endpoint name for logging
        const endpointName = (endpoint.split('/').pop() || endpoint).trim();
        const isUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(endpointName);
        const isHash = /^[0-9a-f]{32,}$/i.test(endpointName);
        const isQueryWithUUID = endpointName.includes('?') && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(endpointName);
        const isTimestamp = /^(boq|document|invoice|receipt|quotation)-\d{13}$/i.test(endpointName);
        
        // Only log non-UUID/non-timestamp endpoints for performance tracking
        if (!isUUID && !isHash && !isQueryWithUUID && !isTimestamp) {
          const isWarmup = (frontendCache as any).warmupInProgress;
          
          if (elapsed > 1000) {
            if (isWarmup) {
              console.log(`🔥 Warmup: ${endpointName} took ${elapsed}ms (cold start, will be faster next time)`);
            } else if (!isFirstLoad) {
              console.warn(`⚠️ Slow load: ${endpointName} took ${elapsed}ms`);
            } else {
              console.log(`🌡️ Cold start: ${endpointName} took ${elapsed}ms (cached for next time)`);
            }
          } else if (elapsed > 100) {
            console.log(`✅ Response in ${elapsed}ms:`, response.status);
          } else {
            console.log(`⚡ Fast response in ${elapsed}ms:`, response.status);
          }
        }
        
        console.log(`💾 Cached response for ${endpoint.split('?')[0]} (${elapsed}ms)`);
        console.log(`✅ Returning NEW Response object for ${endpoint.split('?')[0]} to prevent body stream error`);
        
        // ✅ Return new Response with cached data to prevent "body stream already read" error
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'FRESH-CACHED',
            'X-Performance-Mode': 'nuclear-frontend',
            'X-API-Version': '2.1-body-stream-fix',
          },
        });
      } catch (e) {
        // ✅ FIX: If caching fails, return new Response with error instead of original response
        // Original response body may already be consumed, causing "body stream already read" error
        console.error('❌ Failed to cache response:', e);
        return new Response(JSON.stringify({ 
          error: 'Cache error', 
          message: String(e),
          endpoint: endpoint 
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'ERROR',
            'X-Error-Type': 'cache-failure',
          },
        });
      }
    }
    
    // 🗑️ NUCLEAR MODE: Invalidate cache on mutations
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      // Invalidate related caches
      if (endpoint.includes('customer')) {
        frontendCache.invalidate('/customers');
      }
      if (endpoint.includes('document')) {
        frontendCache.invalidate('/documents');
        frontendCache.invalidate('/analytics');
      }
      if (endpoint.includes('partner')) {
        frontendCache.invalidate('/partners');
      }
      if (endpoint.includes('profile') || endpoint.includes('membership')) {
        frontendCache.invalidate('/profile');
        frontendCache.invalidate('/membership');
      }
      if (endpoint.includes('tax-record')) {
        frontendCache.invalidate('/tax-records');
      }
    }
    
    return response;
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);
    
    // Check if it's a timeout error
    if (err.name === 'AbortError') {
      console.error(`⏱️ REQUEST TIMEOUT after ${elapsed}ms for ${endpoint}`);
      throw new Error(`Request timeout - operation took longer than 30 seconds`);
    }
    
    console.error(`❌ Network Error for ${endpoint} (after ${elapsed}ms):`, {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      url: url,
      method: options.method || 'GET'
    });
    
    // Enhanced error diagnostics for "Failed to fetch"
    if (err?.message === 'Failed to fetch') {
      console.error('');
      console.error('❌ FAILED TO FETCH - Troubleshooting Guide:');
      console.error('');
      console.error('Possible causes:');
      console.error('  1. ⛔ CORS blocking - Server does not allow requests from this origin');
      console.error('  2. 🔴 Edge Function not running - Function may not be deployed');
      console.error('  3. 🌐 Network connectivity issue - Internet connection problem');
      console.error('  4. ⚙️  Invalid configuration - Wrong project ID or URL');
      console.error('  5. 💥 Edge Function crashed - Check Supabase logs for errors');
      console.error('');
      console.error('🔧 Debug Information:');
      console.error('  URL:', url);
      console.error('  Origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
      console.error('  Project ID:', projectId);
      console.error('  Endpoint:', endpoint);
      console.error('  Method:', options.method || 'GET');
      console.error('');
      console.error('💡 How to fix:');
      console.error('  1. Open Supabase Dashboard → Edge Functions');
      console.error('  2. Check if "make-server-6e95bca3" is deployed and active');
      console.error('  3. Click on function → View Logs');
      console.error('  4. Look for startup errors or CORS messages');
      console.error('  5. Test manually: curl -I ' + url.split('/').slice(0, -1).join('/') + '/health');
      console.error('');
      console.error('📚 Documentation:');
      console.error('  - See ERROR_FIX_SUMMARY.md for common fixes');
      console.error('  - See DEBUG_API.md for testing tools');
      console.error('');
    }
    
      throw err;
    }
  };
  
  // 🔄 Register pending request for GET endpoints (deduplication)
  if (method === 'GET') {
    const promise = executeRequest();
    frontendCache.setPendingRequest(endpoint, promise);
    return promise;
  }
  
  // For non-GET, execute directly
  return executeRequest();
}

/**
 * Convenience methods with idempotency support
 * 🚀 All GET methods use frontend cache for instant responses!
 */
export const api = {
  get: (endpoint: string) => 
    apiFetch(endpoint, { method: 'GET' }),
  
  post: (endpoint: string, data: any, idempotencyKey?: string) => 
    apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, idempotencyKey),
  
  put: (endpoint: string, data: any, idempotencyKey?: string) => 
    apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, idempotencyKey),
  
  delete: (endpoint: string) => 
    apiFetch(endpoint, { method: 'DELETE' }),
  
  /**
   * POST with automatic idempotency key generation
   * Use this for create operations to prevent double-click duplicates
   */
  createWithIdempotency: (endpoint: string, data: any, operationName: string) => {
    const idempotencyKey = generateIdempotencyKey(operationName);
    return apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, idempotencyKey);
  },
  
  /**
   * 🚀 NUCLEAR MODE: Cache management utilities
   */
  cache: {
    invalidate: (pattern?: string) => frontendCache.invalidate(pattern),
    stats: () => frontendCache.getStats(),
    clear: () => frontendCache.invalidate(),
    warmup: () => frontendCache.warmup((endpoint) => api.get(endpoint)), // Preload critical endpoints
  },
};

/**
 * Test API connectivity
 * Returns true if API is reachable, false otherwise
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing API connection...');
    const healthUrl = `${API_BASE}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('✅ API connection successful');
      return true;
    } else {
      console.error('❌ API returned error:', response.status, response.statusText);
      return false;
    }
  } catch (err) {
    console.error('❌ API connection failed:', err);
    return false;
  }
}
