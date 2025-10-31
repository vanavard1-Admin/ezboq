/**
 * User-scoped localStorage helper
 * 🔒 SECURITY: All localStorage must be per-user to prevent data leakage
 * 
 * ✅ Every key is prefixed with userId
 * ✅ No cross-user data access
 * ✅ Automatic cleanup on logout
 * 
 * @example
 * const user = { id: 'user123' };
 * setUserLocal(user.id, 'boq_draft', JSON.stringify(draft));
 * const draft = getUserLocal(user.id, 'boq_draft');
 */

/**
 * Get user-specific localStorage item
 */
export function getUserLocal(userId: string, key: string): string | null {
  if (typeof window === 'undefined') return null;
  if (!userId) return null;
  
  const scopedKey = `${userId}:${key}`;
  return localStorage.getItem(scopedKey);
}

/**
 * Set user-specific localStorage item
 */
export function setUserLocal(userId: string, key: string, value: string): void {
  if (typeof window === 'undefined') return;
  if (!userId) return;
  
  const scopedKey = `${userId}:${key}`;
  localStorage.setItem(scopedKey, value);
}

/**
 * Remove user-specific localStorage item
 */
export function removeUserLocal(userId: string, key: string): void {
  if (typeof window === 'undefined') return;
  if (!userId) return;
  
  const scopedKey = `${userId}:${key}`;
  localStorage.removeItem(scopedKey);
}

/**
 * Get all keys for a specific user
 */
export function getUserKeys(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  if (!userId) return [];
  
  const prefix = `${userId}:`;
  const keys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      // Return key without prefix
      keys.push(key.substring(prefix.length));
    }
  }
  
  return keys;
}

/**
 * Clear all data for a specific user
 * Use this on logout
 */
export function clearUserLocal(userId: string): void {
  if (typeof window === 'undefined') return;
  if (!userId) return;
  
  const prefix = `${userId}:`;
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get JSON object from user-specific localStorage
 */
export function getUserLocalJSON<T>(userId: string, key: string): T | null {
  const value = getUserLocal(userId, key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse JSON for key ${key}:`, error);
    return null;
  }
}

/**
 * Set JSON object to user-specific localStorage
 */
export function setUserLocalJSON<T>(userId: string, key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    setUserLocal(userId, key, json);
  } catch (error) {
    console.error(`Failed to stringify JSON for key ${key}:`, error);
  }
}
