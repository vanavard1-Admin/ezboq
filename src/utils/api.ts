import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from './supabase/client';
import { log, logTokenInfo } from './logger';

// API Base URL
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3`;

// 🔒 Cache for access token to avoid repeated calls
let cachedToken: string | null = null;
let cachedUserId: string | null = null;
let tokenFetchInProgress: Promise<string | null> | null = null; // 🔥 Prevent concurrent fetches

/**
 * 🔒 Get user access token from Supabase session
 * This replaces the X-User-Id header approach with proper JWT authentication
 */
async function getAccessToken(): Promise<string | null> {
  // 🔥 If fetch is already in progress, wait for it
  if (tokenFetchInProgress) {
    log.debug('⏳ Token fetch already in progress, waiting...');
    return tokenFetchInProgress;
  }
  
  // 🔥 Start new fetch and cache the promise
  tokenFetchInProgress = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        log.error('❌ Error getting session:', error);
        // Clear cached token on error
        cachedToken = null;
        cachedUserId = null;
        return null;
      }
      
      if (!session?.access_token) {
        log.debug('⚠️ No active session found');
        // Clear cached token
        cachedToken = null;
        cachedUserId = null;
        return null;
      }
      
      const token = session.access_token;
      const userId = session.user?.id;
      
      // ⚠️ CRITICAL CHECK 1: Verify we're not sending ANON_KEY
      if (token === publicAnonKey) {
        log.error('🚨 CRITICAL ERROR: Attempting to use ANON_KEY as access token!');
        cachedToken = null;
        cachedUserId = null;
        return null;
      }
      
      // ⚠️ CRITICAL CHECK 2: Verify JWT structure (must have 3 parts)
      const jwtParts = token.split('.');
      if (jwtParts.length !== 3) {
        log.error('🚨 CRITICAL ERROR: Invalid JWT structure! Parts:', jwtParts.length);
        log.error('🚨 Token might be ANON_KEY instead of access_token');
        cachedToken = null;
        cachedUserId = null;
        return null;
      }
      
      // ⚠️ CRITICAL CHECK 3: Verify JWT has 'sub' claim (user ID) and not expired
      try {
        const payload = JSON.parse(atob(jwtParts[1]));
        
        if (!payload.sub) {
          log.error('🚨 BAD JWT ERROR DETECTED!');
          log.error('🚨 This means the token is not a valid JWT or is malformed');
          log.error('JWT payload:', payload);
          cachedToken = null;
          cachedUserId = null;
          return null;
        }
        
        // ⚠️ CRITICAL CHECK 4: Verify token is not expired
        if (payload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            log.warn('🔄 Token expired, refreshing session...');
            
            // Try to refresh the session
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !newSession?.access_token) {
              log.error('❌ Failed to refresh session:', refreshError);
              cachedToken = null;
              cachedUserId = null;
              return null;
            }
            
            // Use the new refreshed token
            const newToken = newSession.access_token;
            const newUserId = newSession.user?.id;
            
            if (newToken !== cachedToken) {
              logTokenInfo(newToken, 'Refreshed token');
              cachedToken = newToken;
            }
            
            if (newUserId && newUserId !== cachedUserId) {
              cachedUserId = newUserId;
              log.debug('User session refreshed');
            }
            
            return newToken;
          }
        }
        
        // Verify user ID matches
        if (userId && payload.sub !== userId) {
          log.error('🚨 JWT sub claim mismatch!', { 
            jwtSub: payload.sub, 
            sessionUserId: userId 
          });
          cachedToken = null;
          cachedUserId = null;
          return null;
        }
      } catch (e) {
        log.error('🚨 Failed to parse JWT payload:', e);
        cachedToken = null;
        cachedUserId = null;
        return null;
      }
      
      // 🐛 DEBUG: Log token info safely (only on changes)
      if (token !== cachedToken) {
        logTokenInfo(token, 'Access token');
        log.debug('Token metadata:', {
          hasUserId: !!userId,
          isAnonKey: token === publicAnonKey,
        });
      }
      
      // Only log when token changes (avoid spam)
      if (token !== cachedToken) {
        logTokenInfo(token, 'New token');
        cachedToken = token;
      }
      
      // Update userId if changed
      if (userId && userId !== cachedUserId) {
        cachedUserId = userId;
        log.debug('User session updated');
      }
      
      return token;
    } catch (error) {
      log.error('❌ Failed to get access token:', error);
      return null;
    } finally {
      // Clear in-progress flag after a small delay to allow concurrent calls to use cached result
      setTimeout(() => {
        tokenFetchInProgress = null;
      }, 100);
    }
  })();
  
  return tokenFetchInProgress;
}

/**
 * Generate idempotency key for requests
 * Format: {operation}-{timestamp}-{random}
 */
export function generateIdempotencyKey(operation: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${operation}-${timestamp}-${random}`;
}

/**
 * 🔍 Debug helper: Check current session and token
 * Use in browser console: await checkAuthDebug()
 */
export async function checkAuthDebug(): Promise<void> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error);
      return;
    }
    
    if (!session) {
      console.warn('⚠️ No active session found');
      return;
    }
    
    const token = session.access_token;
    const parts = token.split('.');
    
    console.log('🔐 Auth Debug Info:');
    console.log('================');
    console.log('✅ Session active:', !!session);
    console.log('👤 User ID:', session.user?.id);
    console.log('📧 Email:', session.user?.email);
    console.log('🎫 Token length:', token.length);
    console.log('🔢 JWT parts:', parts.length, '(should be 3)');
    console.log('🆔 Is ANON_KEY:', token === publicAnonKey ? '❌ YES (BAD!)' : '✅ No (Good)');
    
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const minutesRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60);
        
        console.log('📝 JWT Payload:');
        console.log('  - sub (user ID):', payload.sub, payload.sub ? '✅' : '❌ MISSING!');
        console.log('  - Expires at:', expiresAt.toLocaleString());
        console.log('  - Is expired:', now > expiresAt ? '❌ YES (BAD!)' : '✅ No');
        console.log('  - Time remaining:', minutesRemaining, 'minutes');
        console.log('  - Role:', payload.role);
      } catch (e) {
        console.error('❌ Failed to decode JWT payload:', e);
      }
    } else {
      console.error('❌ Invalid JWT structure! Not 3 parts.');
    }
    
    // Test API call
    console.log('\n🧪 Testing API call...');
    const testToken = await getAccessToken();
    console.log('✅ getAccessToken() returned:', testToken ? 'Valid token' : '❌ NULL');
    
  } catch (error) {
    console.error('❌ Debug check failed:', error);
  }
}

/**
 * 🔄 Force refresh auth token
 * Use in browser console: await refreshAuthToken()
 */
export async function refreshAuthToken(): Promise<void> {
  try {
    console.log('🔄 Refreshing auth token...');
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Failed to refresh:', error);
      return;
    }
    
    console.log('✅ Token refreshed successfully');
    console.log('👤 User ID:', data.session?.user?.id);
    
    // Clear cached token to force re-fetch
    cachedToken = null;
    cachedUserId = null;
    tokenFetchInProgress = null;
    
    console.log('🧹 Token cache cleared');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  }
}

/**
 * 🔒 User-specific localStorage helpers
 * These ensure each user has isolated storage
 */

let currentUserId: string | null = null;

/**
 * 🔒 Wait for userId to be set (with timeout)
 * This ensures we never make API calls without userId
 */
export async function waitForUserId(timeoutMs: number = 5000): Promise<string | null> {
  // If already set, return immediately
  if (currentUserId) {
    return currentUserId;
  }
  
  // Wait for userId to be set
  const startTime = Date.now();
  while (!currentUserId && (Date.now() - startTime) < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!currentUserId) {
    log.error('❌ Timeout waiting for userId to be set!');
  }
  
  return currentUserId;
}

/**
 * 🚫 Track warmed endpoints to prevent duplicate warmup calls
 * Each endpoint is called ONCE per user session
 */
const warmedEndpoints = new Set<string>();

/**
 * 🔥 Warmup a single endpoint (only once per session)
 * 
 * @param path - Endpoint path (e.g., '/profile', '/customers')
 * @returns true if warmed successfully, false if skipped (404 or already warmed)
 * 
 * @example
 * await warmupOnce('/profile');
 * await warmupOnce('/customers');
 */
export async function warmupOnce(path: string): Promise<boolean> {
  // Already warmed? Skip
  if (warmedEndpoints.has(path)) {
    log.debug(`⏭️ Skipping warmup for ${path} (already warmed)`);
    return false;
  }
  
  // Mark as warmed (even if it fails, don't retry)
  warmedEndpoints.add(path);
  
  try {
    const response = await api.get(path, { noThrow: true } as any);
    
    if (!response.ok) {
      if (response.status === 404) {
        log.debug(`❌ Endpoint not found: ${path} (404) - stopped, no retry`);
        return false;
      }
      
      log.warn(`⚠️ Warmup returned ${response.status} for ${path}`);
      return false;
    }
    
    log.debug(`✅ Warmed up: ${path}`);
    return true;
  } catch (error: any) {
    log.warn(`⚠️ Failed to warm up ${path}:`, error.message);
    return false;
  }
}

/**
 * Get user-specific localStorage key
 */
function getUserKey(key: string): string {
  if (!currentUserId) {
    log.warn(`⚠️ getUserKey called without userId set! Key: ${key}`);
    return key; // Fallback to non-prefixed key
  }
  return `${currentUserId}:${key}`;
}

/**
 * Get item from user-specific localStorage
 */
export function getUserLocalStorage(key: string): string | null {
  const userKey = getUserKey(key);
  return localStorage.getItem(userKey);
}

/**
 * Set item to user-specific localStorage
 */
export function setUserLocalStorage(key: string, value: string): void {
  const userKey = getUserKey(key);
  localStorage.setItem(userKey, value);
}

/**
 * Remove item from user-specific localStorage
 */
export function removeUserLocalStorage(key: string): void {
  const userKey = getUserKey(key);
  localStorage.removeItem(userKey);
}

/**
 * Clear ALL user-specific localStorage (for current user)
 */
export function clearUserLocalStorage(): void {
  if (!currentUserId) {
    log.warn('⚠️ clearUserLocalStorage called without userId set!');
    return;
  }
  
  const prefix = `${currentUserId}:`;
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  log.debug(`🧹 Cleared ${keysToRemove.length} localStorage items`);
}

/**
 * 🔒 CRITICAL: Set user ID for cache isolation
 * MUST be called on login/logout to prevent users from seeing each other's data!
 * 
 * @param userId - User ID (null on logout)
 */
export function setApiUserId(userId: string | null): void {
  log.debug('🔒 setApiUserId called');
  frontendCache.setUserId(userId);
  currentUserId = userId; // Store for API requests
  
  // 🚨 EMERGENCY: Clear OLD cache without userId prefix!
  if (userId) {
    log.debug('🧹 Cleaning up old cache entries...');
    let cleanedCount = 0;
    
    // Get all localStorage keys
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    log.debug(`🔍 Found ${allKeys.length} total localStorage keys`);
    
    for (const key of allKeys) {
      // Skip protected keys
      if (key === 'demo-mode' || 
          key === 'demo-user' || 
          key === 'demo-session-id' || 
          key === 'last-view' ||
          key.startsWith('demo-')) {
        continue;
      }
      
      // 🚨 AGGRESSIVE: Remove ALL old cache keys that don't have current userId prefix!
      // This includes:
      // - Keys without ":" separator (old format like "cache-customers", "boq_customers")
      // - Keys with OTHER user's ID prefix (e.g., "otherUserId:customers")
      const hasCurrentUserPrefix = key.startsWith(`${userId}:`);
      const hasColon = key.includes(':');
      
      // Remove if:
      // 1. Has no colon (old format without userId)
      // 2. Has colon but different userId prefix
      if (!hasCurrentUserPrefix && (key.startsWith('cache-') || 
                                     key.startsWith('boq_') || 
                                     (hasColon && key.includes('cache')) ||
                                     (hasColon && key.includes('customers')) ||
                                     (hasColon && key.includes('partners')))) {
        localStorage.removeItem(key);
        cleanedCount++;
        log.debug(`🗑️ Removed old cache: ${key}`);
      }
    }
    
    if (cleanedCount > 0) {
      log.debug(`✅ Cleaned ${cleanedCount} old cache entries`);
      log.debug(`🔒 Cache isolated for current user`);
    } else {
      log.debug(`✅ No old cache to clean - already isolated`);
    }
  }
}

/**
 * Frontend cache with aggressive localStorage integration
 */
class FrontendCache {
  private cache = new Map<string, any>();
  private pendingRequests = new Map<string, Promise<Response>>();
  private firstLoadTracking = new Map<string, boolean>();
  private currentUserId: string | null = null;
  // + เพิ่ม Pub/Sub
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    log.info('🔥 FrontendCache initialized');
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(key: string, fn: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const set = this.listeners.get(key)!;
    set.add(fn);
    
    return () => {
      set.delete(fn);
      if (set.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Notify listeners about cache updates
   */
  private notify(key: string, data: any): void {
    const ls = this.listeners.get(key);
    if (!ls) return;
    
    ls.forEach(fn => {
      try {
        fn(data);
      } catch (e) {
        log.warn('Error in cache listener:', e);
      }
    });
  }

  /**
   * 🔒 Set current user ID - MUST be called on login/logout!
   * This ensures cache isolation between users
   */
  setUserId(userId: string | null): void {
    if (this.currentUserId !== userId) {
      log.info(`🔒 User changed from "${this.currentUserId}" to "${userId}" - clearing cache!`);
      
      // Clear old user's cache from memory
      this.cache.clear();
      this.firstLoadTracking.clear(); // 🔒 Also clear first load tracking
      this.pendingRequests.clear(); // 🔒 Clear pending requests
      
      // Update current user
      this.currentUserId = userId;
      currentUserId = userId; // Update global variable for localStorage helpers
      
      // Load new user's cache from localStorage
      if (userId) {
        this.loadFromStorage();
      }
      
      log.info(`✅ Cache isolated for user: ${userId}`);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.currentUserId) return;
    
    try {
      const prefix = `${this.currentUserId}:cache-`;
      let loadedCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const cacheKey = key.substring(prefix.length);
          const data = localStorage.getItem(key);
          if (data) {
            try {
              this.cache.set(cacheKey, JSON.parse(data));
              loadedCount++;
            } catch (e) {
              log.warn(`Failed to parse cache for ${cacheKey}:`, e);
            }
          }
        }
      }
      
      if (loadedCount > 0) {
        log.info(`📦 Loaded ${loadedCount} cached items from localStorage for user: ${this.currentUserId}`);
      }
    } catch (error) {
      log.error('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Save to localStorage (user-specific)
   */
  private saveToStorage(key: string, data: any): void {
    try {
      setUserLocalStorage(`cache-${key}`, JSON.stringify(data));
    } catch (error) {
      log.warn(`Failed to save cache for ${key}:`, error);
    }
  }

  /**
   * Get cached data
   */
  get(key: string): any {
    return this.cache.get(key);
  }

  /**
   * Set cached data and save to localStorage
   */
  set(key: string, data: any): void {
    this.cache.set(key, data);
    this.saveToStorage(key, data);
    this.notify(key, data);
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
    // Also remove from localStorage
    try {
      removeUserLocalStorage(`cache-${key}`);
    } catch (error) {
      log.warn(`Failed to remove cache from localStorage for ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if this is the first load for a given key
   */
  isFirstLoad(key: string): boolean {
    return !this.firstLoadTracking.has(key);
  }

  /**
   * Mark a key as loaded
   */
  markAsLoaded(key: string): void {
    this.firstLoadTracking.set(key, true);
  }

  /**
   * Get pending request
   */
  getPending(key: string): Promise<Response> | undefined {
    return this.pendingRequests.get(key);
  }

  /**
   * Set pending request
   */
  setPending(key: string, promise: Promise<Response>): void {
    this.pendingRequests.set(key, promise);
  }

  /**
   * Clear pending request
   */
  clearPending(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; entries: Array<{ key: string; size: number }> } {
    const entries: Array<{ key: string; size: number }> = [];
    
    this.cache.forEach((value, key) => {
      try {
        const size = JSON.stringify(value).length;
        entries.push({ key, size });
      } catch (e) {
        entries.push({ key, size: 0 });
      }
    });

    return {
      size: this.cache.size,
      entries: entries.sort((a, b) => b.size - a.size), // Sort by size descending
    };
  }

  /**
   * 🔥 Aggressive cache warmup - load everything at startup
   * 🚫 Prevents warmup loop/404 spam - only calls each endpoint ONCE per user
   */
  async warmup(): Promise<void> {
    // Wait for userId to be set (with timeout)
    log.info('🔥 NUCLEAR MODE: Waiting for userId before cache warmup...');
    const userId = await waitForUserId(5000);
    
    if (!userId) {
      log.info('⚠️ Skipping warmup - no user ID set after timeout');
      return;
    }
    
    log.info(`🔥 NUCLEAR MODE: Starting aggressive cache warmup for user: ${userId.substring(0, 8)}...`);
    
    // 🔒 CRITICAL: Verify we have a valid session/token before warming up
    const token = await getAccessToken();
    if (!token) {
      log.warn('⚠️ Skipping warmup - no valid access token available');
      return;
    }
    
    log.info(`✅ Access token verified for warmup (length: ${token.length})`);
    
    // ✅ Only endpoints that actually exist and are needed on startup
    const endpoints = [
      '/profile',    // User profile (now available!)
      '/customers',  // Customer list
      '/partners',   // Partner list
      '/documents',  // Document list
    ];

    const results = { ok: 0, error404: 0, error401: 0, error5xx: 0 };

    // 🚫 กัน loop: เรียกแต่ละ endpoint แค่ครั้งเดียว (with retry)
    const warmupPromises = endpoints.map(async (endpoint) => {
      const maxRetries = 2; // Retry up to 2 times for warmup
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            log.debug(`🔄 Warmup retry ${attempt}/${maxRetries} for ${endpoint}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          // 🔒 CRITICAL: Get fresh access token for each request
          const token = await getAccessToken();
          
          if (!token) {
            log.info(`⚠️ Skipping warmup for ${endpoint} - no access token`);
            results.error401++;
            return;
          }
          
          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
          };
          
          // Add timeout for warmup requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for warmup
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3${endpoint}`,
            { headers, signal: controller.signal }
          );
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            this.set(endpoint.substring(1), data);
            log.info(`✅ Warmed up: ${endpoint}${attempt > 0 ? ` (after ${attempt} retries)` : ''}`);
            results.ok++;
            return; // Success - exit retry loop
          } else if (response.status === 404) {
            // ❌ 404 = endpoint doesn't exist, STOP (no retry)
            log.info(`❌ 404 Not Found: ${endpoint} (stopped - no retry)`);
            results.error404++;
            return; // Don't retry 404s
          } else if (response.status === 401 || response.status === 403) {
            // 🔒 Auth error - log but don't retry
            log.warn(`⚠️ Auth error ${response.status} for ${endpoint}`);
            results.error401++;
            return;
          } else if (response.status >= 500 && attempt < maxRetries) {
            // ⚠️ 5xx errors - retry
            log.debug(`⚠️ Warmup returned ${response.status} for ${endpoint}, retrying...`);
            continue;
          } else {
            // Other errors
            log.info(`⚠️ Warmup returned ${response.status} for ${endpoint}`);
            results.error5xx++;
            return;
          }
        } catch (error: any) {
          if (error.name === 'AbortError' && attempt < maxRetries) {
            log.debug(`⏱️ Warmup timeout for ${endpoint}, retrying...`);
            continue;
          }
          
          if (attempt === maxRetries) {
            log.info(`⚠️ Failed to warm up ${endpoint} after ${maxRetries} retries:`, error.message);
            results.error5xx++;
            return;
          }
        }
      }
    });

    await Promise.all(warmupPromises);
    log.info(`🔥 Cache warmup complete! Results:`, results);
  }
}

// Create singleton instance
const frontendCache = new FrontendCache();

/**
 * API wrapper with frontend caching
 */
export const api = {
  cache: frontendCache,

  /**
   * 🔥 GET with cache-first strategy
   * Returns cached data INSTANTLY, then refreshes in background
   */
  async get(endpoint: string, options: { skipCache?: boolean; signal?: AbortSignal; retries?: number } = {}): Promise<any> {
    // 🔒 CRITICAL SECURITY: Get access token for authentication
    const token = await getAccessToken();
    
    if (!token) {
      log.error('❌ GET request denied: No access token available');
      return { error: 'Unauthorized', message: 'Authentication required', status: 401 };
    }
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    log.debug(`📡 GET ${normalizedEndpoint} (full URL: ${API_BASE}${normalizedEndpoint})`);
    
    // ⚡ Cache key based on endpoint
    const cacheKey = normalizedEndpoint.split('?')[0].replace(/^\//, '');
    
    // Get user ID for cache isolation
    const userId = currentUserId;
    
    // 🔒 IMPORTANT: Only use cache if userId matches!
    const cachedData = this.cache.get(cacheKey);
    const shouldUseCache = !options.skipCache && cachedData && cachedData.userId === userId;
    
    if (shouldUseCache) {
      log.debug(`⚡ INSTANT CACHE HIT: ${cacheKey}`);
      
      // Return cached data instantly
      const result = cachedData.data;
      
      // 🔥 Background refresh (silent update)
      setTimeout(() => {
        log.debug(`🔄 Background refresh: ${cacheKey}`);
        getAccessToken().then(refreshToken => {
          if (!refreshToken) return;
          
          // ⏱️ Add timeout for background refresh (30s)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          fetch(`${API_BASE}${normalizedEndpoint}`, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })
            .then(res => res.json())
            .then(freshData => {
              clearTimeout(timeoutId);
              // Update cache with fresh data
              this.cache.set(cacheKey, { data: freshData, timestamp: Date.now(), userId });
              setUserLocalStorage(`cache-${cacheKey}`, JSON.stringify(freshData));
              log.debug(`✅ Background update complete: ${cacheKey}`);
            })
            .catch(err => {
              clearTimeout(timeoutId);
              if (err.name === 'AbortError') {
                log.warn(`⏱️ Background refresh timeout (30s): ${cacheKey}`);
              } else if (err.name !== 'AbortError') {
                log.warn(`⚠️ Background refresh failed: ${cacheKey}`, err.message);
              }
            });
        });
      }, 100);
      
      return result;
    }
    
    // ⏱️ No cache - fetch from server with timeout and retry logic
    log.debug(`📊 Cache miss - fetching: ${cacheKey}`);
    
    const maxRetries = options.retries ?? 1; // Default 1 retry for GET requests
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          log.debug(`🔄 Retry attempt ${attempt}/${maxRetries} for ${endpoint}`);
          // Exponential backoff: 500ms, 1s, 2s
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
        }
        
        // ⏱️ Create timeout controller (15 seconds - allows for cold starts)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: options.signal || controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Handle 401/403 specially - don't retry
          if (response.status === 401 || response.status === 403) {
            log.error(`❌ Authentication failed for ${endpoint}`);
            return { error: 'Unauthorized', status: response.status };
          }
          
          // 5xx errors - retry
          if (response.status >= 500 && attempt < maxRetries) {
            lastError = new Error(`HTTP ${response.status}`);
            continue;
          }
          
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // ⚡ Cache the result for next time
        this.cache.set(cacheKey, { data, timestamp: Date.now(), userId });
        setUserLocalStorage(`cache-${cacheKey}`, JSON.stringify(data));
        
        if (attempt > 0) {
          log.debug(`✅ Fetched and cached: ${cacheKey} (after ${attempt} retries)`);
        } else {
          log.debug(`✅ Fetched and cached: ${cacheKey}`);
        }
        
        return data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on abort/timeout unless it's not the last attempt
        if (error.name === 'AbortError' && attempt < maxRetries) {
          log.debug(`⏱️ Timeout on attempt ${attempt + 1}, retrying...`);
          continue;
        }
        
        // Last attempt or non-retryable error
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    // All retries exhausted - handle error
    const error = lastError;
    if (error.name === 'AbortError') {
      log.warn(`⏱️ API timeout after 15s for ${endpoint} (${maxRetries} retries exhausted), using localStorage fallback`);
      
      // Try localStorage fallback
      try {
        const fallback = getUserLocalStorage(`cache-${cacheKey}`);
        if (fallback) {
          const data = JSON.parse(fallback);
          log.debug(`✅ Using localStorage fallback for ${cacheKey}`);
          return data;
        }
      } catch (e) {
        log.warn('Failed to parse localStorage fallback');
      }
      
      // If we have stale cache, return it
      if (cachedData) {
        log.debug(`✅ Using stale cache for ${cacheKey} (after timeout)`);
        return cachedData.data;
      }
      
      // No fallback available
      throw new Error(`API timeout after 15s - server may be slow or unavailable`);
    }
    
    log.error(`❌ GET ${endpoint} failed:`, error);
    
    // On error, try to return stale cache
    if (cachedData) {
      log.warn(`⚠️ Using stale cache due to error: ${cacheKey}`);
      return cachedData.data;
    }
    
    throw error;
  },

  /**
   * POST request
   */
  async post(endpoint: string, body: any, options: { signal?: AbortSignal } = {}): Promise<any> {
    // 🔒 CRITICAL: Get access token for authentication
    const token = await getAccessToken();
    
    if (!token) {
      log.error('❌ POST request denied: No access token');
      throw new Error('Authentication required - No access token available');
    }
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    log.debug(`📤 POST ${normalizedEndpoint}`);
    
    // ⏱️ Create timeout controller (15 seconds for POST)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          // Try to get error as text first
          errorText = await response.text();
        } catch (e) {
          log.warn('⚠️ Could not read error response as text');
        }
        log.error(`❌ POST ${normalizedEndpoint} failed (${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // 🔥 Invalidate cache for related resources after POST
      const resource = normalizedEndpoint.split('/')[1];
      if (resource) {
        this.cache.delete(resource);
        removeUserLocalStorage(`cache-${resource}`);
        log.debug(`🔄 Cache invalidated for: ${resource}`);
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after 15s for ${endpoint}`);
      }
      throw error;
    }
  },

  /**
   * PUT request
   */
  async put(endpoint: string, body: any, options: { signal?: AbortSignal } = {}): Promise<any> {
    // 🔒 CRITICAL: Get access token for authentication
    const token = await getAccessToken();
    
    if (!token) {
      log.error('❌ PUT request denied: No access token');
      throw new Error('Authentication required - No access token available');
    }
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    log.debug(`📝 PUT ${normalizedEndpoint}`);
    
    // ⏱️ Create timeout controller (15 seconds for PUT)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          // Try to get error as text first
          errorText = await response.text();
        } catch (e) {
          log.warn('⚠️ Could not read error response as text');
        }
        log.error(`❌ PUT ${normalizedEndpoint} failed (${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // 🔥 Invalidate cache after PUT
      const resource = normalizedEndpoint.split('/')[1];
      if (resource) {
        this.cache.delete(resource);
        removeUserLocalStorage(`cache-${resource}`);
        log.debug(`🔄 Cache invalidated for: ${resource}`);
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after 15s for ${endpoint}`);
      }
      throw error;
    }
  },

  /**
   * DELETE request
   */
  async delete(endpoint: string, options: { signal?: AbortSignal } = {}): Promise<any> {
    // 🔒 CRITICAL: Get access token for authentication
    const token = await getAccessToken();
    
    if (!token) {
      log.error('❌ DELETE request denied: No access token');
      throw new Error('Authentication required - No access token available');
    }
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    log.debug(`🗑️ DELETE ${normalizedEndpoint}`);
    
    // ⏱️ Create timeout controller (10 seconds for DELETE)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          // Try to get error as text first
          errorText = await response.text();
        } catch (e) {
          log.warn('⚠️ Could not read error response as text');
        }
        log.error(`❌ DELETE ${normalizedEndpoint} failed (${response.status}):`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // 🔥 Invalidate cache after DELETE
      const resource = normalizedEndpoint.split('/')[1];
      if (resource) {
        this.cache.delete(resource);
        removeUserLocalStorage(`cache-${resource}`);
        log.debug(`🔄 Cache invalidated for: ${resource}`);
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after 10s for ${endpoint}`);
      }
      throw error;
    }
  }
};