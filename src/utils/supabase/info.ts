const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const projectId = url ? url.replace('https://','').split('.')[0] : '';
export const publicAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const isProduction = !!url; export const isDevelopment = !isProduction;
