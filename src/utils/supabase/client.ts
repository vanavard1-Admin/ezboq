import { createClient, SupabaseClient } from '@supabase/supabase-js';
let supabaseInstance: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!url || !anon) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    supabaseInstance = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return supabaseInstance;
}
export const supabase = getSupabaseClient();
