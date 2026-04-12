/**
 * EzDoc - User Throttle Service
 * 
 * Simple in-memory throttling for rate-limiting user actions.
 */

// In-memory cache for last action timestamps
const lastActionCache: Map<string, number> = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Check if action is allowed (throttled)
 * @param userId User ID (lineUserId or firebase UID)
 * @param action Action type (e.g., "image_keyword")
 * @param minIntervalMs Minimum interval between actions in milliseconds
 * @returns true if allowed, false if throttled
 */
export function isActionAllowed(userId: string, action: string, minIntervalMs: number): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const lastAction = lastActionCache.get(key);

  if (!lastAction) {
    lastActionCache.set(key, now);
    return true;
  }

  if (now - lastAction >= minIntervalMs) {
    lastActionCache.set(key, now);
    return true;
  }

  return false;
}

/**
 * Clean up old cache entries
 */
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of lastActionCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      lastActionCache.delete(key);
    }
  }
}

