/**
 * Demo Storage Utility
 * Provides session-specific localStorage for demo mode
 * Each demo session gets its own isolated data storage
 */

import { log } from './logger';

// Get the current demo session ID
export const getDemoSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('demo-session-id');
};

// Check if currently in demo mode
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo-mode') === 'true';
};

// Get a prefixed key for demo storage
const getDemoKey = (key: string): string => {
  const sessionId = getDemoSessionId();
  if (!sessionId) return key;
  return `demo-${sessionId}-${key}`;
};

/**
 * Demo Storage API
 * Use these functions instead of direct localStorage access in demo mode
 */
export const demoStorage = {
  // Get item from demo storage
  getItem: (key: string): string | null => {
    if (!isDemoMode()) return null;
    const demoKey = getDemoKey(key);
    return localStorage.getItem(demoKey);
  },

  // Set item in demo storage
  setItem: (key: string, value: string): void => {
    if (!isDemoMode()) return;
    const demoKey = getDemoKey(key);
    localStorage.setItem(demoKey, value);
  },

  // Remove item from demo storage
  removeItem: (key: string): void => {
    if (!isDemoMode()) return;
    const demoKey = getDemoKey(key);
    localStorage.removeItem(demoKey);
  },

  // Clear all items for current demo session
  clear: (): void => {
    if (!isDemoMode()) return;
    const sessionId = getDemoSessionId();
    if (!sessionId) return;

    const prefix = `demo-${sessionId}-`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  // Get all keys for current demo session
  getAllKeys: (): string[] => {
    if (!isDemoMode()) return [];
    const sessionId = getDemoSessionId();
    if (!sessionId) return [];

    const prefix = `demo-${sessionId}-`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // Remove the prefix to get the original key
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }
};

/**
 * Clean up old demo sessions (optional)
 * Call this on app init to prevent localStorage bloat
 */
export const cleanupOldDemoSessions = (maxAge: number = 7 * 24 * 60 * 60 * 1000): void => {
  if (typeof window === 'undefined') return;

  const currentTime = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('demo-') && key.includes('-')) {
      // Extract timestamp from key (demo-{timestamp}-{random}-{data})
      const parts = key.split('-');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[1]);
        if (!isNaN(timestamp) && currentTime - timestamp > maxAge) {
          keysToRemove.push(key);
        }
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  if (keysToRemove.length > 0) {
    log.info(`🧹 Cleaned up ${keysToRemove.length} old demo session(s)`);
  }
};

/**
 * Get demo session info
 */
export const getDemoSessionInfo = () => {
  const sessionId = getDemoSessionId();
  if (!sessionId) return null;

  // Extract timestamp from session ID
  const parts = sessionId.split('-');
  if (parts.length >= 2) {
    const timestamp = parseInt(parts[1]);
    if (!isNaN(timestamp)) {
      return {
        sessionId,
        createdAt: new Date(timestamp),
        age: Date.now() - timestamp
      };
    }
  }

  return { sessionId, createdAt: null, age: null };
};