import { createClient } from '@supabase/supabase-js';

// Get the appropriate redirect URL based on environment
const getRedirectUrl = () => {
  if (import.meta.env.DEV) {
    // In development, use localhost
    return window.location.origin;
  }
  // In production, use the configured URL or fallback to origin
  return import.meta.env.VITE_REDIRECT_URL || window.location.origin;
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

// Export the redirect URL for use in auth components
export const getAuthRedirectUrl = getRedirectUrl;
