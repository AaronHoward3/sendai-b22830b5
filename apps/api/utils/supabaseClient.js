import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = (url && serviceKey)
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

// Optional: clearer logs
if (supabase) {
  console.log('[API] Connected to Supabase brand_cache');
} else {
  console.warn('[API] [brand cache] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Falling back to disk.');
}
