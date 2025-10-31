/**
 * Production Detection Utility
 * 
 * ✅ Safe across all environments: Browser, Node, Deno (Supabase Edge)
 * ✅ Server-first detection (most accurate)
 * ✅ Browser hostname allowlist (fallback)
 * ✅ Secure default (non-prod unless explicitly configured)
 */

/**
 * Detect if running in production environment
 * 
 * Priority:
 * 1. Server environment variables (Node/Deno)
 * 2. Browser hostname allowlist
 * 3. Default to non-production (safe default)
 */
export function isProd(): boolean {
  try {
    // ========================================
    // 1) SERVER-FIRST DETECTION (Most accurate)
    // ========================================
    
    // Node.js (Vercel/Server)
    // @ts-ignore - safe check for process
    if (typeof process !== 'undefined' && process && process.env) {
      const pe = process.env;
      if (pe.APP_ENV === 'production') return true;
      if (pe.NODE_ENV === 'production') return true;
      if (pe.VERCEL_ENV === 'production') return true; // Vercel production
    }
    
    // Deno (Supabase Edge Functions)
    // @ts-ignore - safe check for Deno
    if (typeof Deno !== 'undefined' && Deno && Deno.env) {
      try {
        // @ts-ignore - Deno.env.get exists in Deno
        const get = (k: string) => (Deno.env.get ? Deno.env.get(k) : undefined);
        if (get('APP_ENV') === 'production') return true;
        if (get('NODE_ENV') === 'production') return true;
        if (get('ENV') === 'production') return true;
      } catch (e) {
        // Deno.env access might fail in some contexts
      }
    }

    // ========================================
    // 2) BROWSER HOSTNAME DETECTION
    // ========================================
    if (typeof window !== 'undefined' && window.location) {
      const h = window.location.hostname.toLowerCase();

      // Clear development indicators
      if (
        h === 'localhost' || 
        h === '127.0.0.1' || 
        h.endsWith('.local') ||
        h.startsWith('dev.') || 
        h.includes('-dev.') || 
        h.startsWith('staging.') ||
        h.endsWith('.vercel.app') // Vercel preview deployments = non-prod
      ) {
        return false;
      }

      // Production hostname allowlist (add your production domains here)
      const PROD_HOSTS = new Set(['ezboq.com', 'www.ezboq.com']);
      if (PROD_HOSTS.has(h)) return true;

      // Any other hostname = non-prod by default (security first)
      return false;
    }

    // ========================================
    // 3) SAFE DEFAULT
    // ========================================
    // If we can't detect, assume non-production (logs will show)
    return false;
  } catch (error) {
    // If any error occurs, default to non-production (safe)
    return false;
  }
}