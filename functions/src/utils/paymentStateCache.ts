/**
 * Payment State Cache
 * 
 * Fast-path cache for payment state in fallback paths
 * TTL: 30 seconds (short-lived, just for fallback latency)
 * 
 * CRITICAL: Only used in fallback paths where DB reads are too slow
 */

interface CachedPaymentState {
  state: 'PROCESSING' | 'RETRY' | 'SUCCESS' | null;
  cachedAt: number;
}

const CACHE_TTL_MS = 30 * 1000; // 30 seconds
const cache = new Map<string, CachedPaymentState>();

/**
 * Get cached payment state (fast path for fallback)
 * Returns null if cache miss or expired
 */
export function getCachedPaymentState(userId: string): 'PROCESSING' | 'RETRY' | 'SUCCESS' | null | null {
  const cached = cache.get(userId);
  if (!cached) {
    return null; // Cache miss
  }
  
  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL_MS) {
    cache.delete(userId); // Expired
    return null;
  }
  
  return cached.state;
}

/**
 * Set cached payment state
 */
export function setCachedPaymentState(
  userId: string,
  state: 'PROCESSING' | 'RETRY' | 'SUCCESS' | null
): void {
  cache.set(userId, {
    state,
    cachedAt: Date.now(),
  });
}

/**
 * Clear cache for user (call after payment state changes)
 */
export function clearCachedPaymentState(userId: string): void {
  cache.delete(userId);
}

/**
 * Clear all cache (for testing/debugging)
 */
export function clearAllCache(): void {
  cache.clear();
}

