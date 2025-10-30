import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create a singleton Supabase client instance
 * This prevents multiple GoTrueClient instances in the same browser context
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'boq-pro-auth', // Custom storage key for this app
        },
      }
    );
  }
  return supabaseInstance;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getSupabaseClient() instead
 */
export function createClient(): SupabaseClient {
  return getSupabaseClient();
}

/**
 * Export the singleton instance directly
 */
export const supabase = getSupabaseClient();
