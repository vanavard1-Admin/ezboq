/**
 * Supabase Configuration
 * 
 * ✅ PRODUCTION: Reads from environment variables (.env file)
 * ✅ DEVELOPMENT (Figma Make): Uses valid fallback values
 * 
 * IMPORTANT FOR DEPLOYMENT:
 * Before deploying to production, create a .env file with:
 * - VITE_SUPABASE_URL=https://your-project.supabase.co
 * - VITE_SUPABASE_ANON_KEY=your-anon-key
 */

// Development fallback values (for Figma Make environment)
// ⚠️ UPDATED with VALID credentials from your Supabase project!
const FALLBACK_SUPABASE_URL = 'https://cezwqajbkjhvumbhpsgy.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE';

// Try to read from environment variables first, fallback to development values
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || FALLBACK_SUPABASE_URL;
const anonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_ANON_KEY;

// Log info if using fallback values (development mode)
if (!import.meta.env?.VITE_SUPABASE_URL) {
  console.info('🔧 Development Mode: Using fallback Supabase configuration');
  console.info('📝 For production deployment: Copy .env.example to .env and add your credentials');
}

// Extract project ID from URL (e.g., https://cezwqajbkjhvumbhpsgy.supabase.co -> cezwqajbkjhvumbhpsgy)
export const projectId = supabaseUrl.replace('https://', '').split('.')[0];

// Export the keys
export const publicAnonKey = anonKey;

// Export environment check helper
export const isProduction = !!import.meta.env?.VITE_SUPABASE_URL;
export const isDevelopment = !isProduction;