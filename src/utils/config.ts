/**
 * Configuration Helper
 * Centralized environment variable access
 * 
 * ✅ Cross-platform: Works in Browser, Node, Deno
 * ✅ Secure: Safe access with fallbacks
 * ✅ Production-ready: No direct import.meta.env usage
 */

import { isProd } from './isProd';

/**
 * Get environment variable value
 * 
 * Priority:
 * 1. Process env (Node.js/Server)
 * 2. Deno env (Edge Functions)
 * 3. Window __ENV__ (Browser runtime injection)
 * 4. Fallback value
 */
export function getEnv(key: string, fallback: string = ''): string {
  // Node.js environment
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return String(process.env[key]);
  }
  
  // Deno environment
  // @ts-ignore - Deno global exists in Supabase Edge
  if (typeof Deno !== 'undefined' && Deno.env?.get) {
    // @ts-ignore
    const val = Deno.env.get(key);
    if (val) return String(val);
  }
  
  // Browser runtime injection
  if (typeof window !== 'undefined') {
    // @ts-ignore
    const windowEnv = (window as any).__ENV__;
    if (windowEnv?.[key]) return String(windowEnv[key]);
  }
  
  return fallback;
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return !isProd();
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return isProd();
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  if (isProd()) return false;
  
  // Check localStorage
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('DEBUG') === 'true';
  }
  
  return getEnv('VITE_DEBUG') === 'true' || getEnv('DEBUG') === 'true';
}

/**
 * Get mode (development/production)
 */
export function getMode(): 'development' | 'production' {
  return isProd() ? 'production' : 'development';
}
