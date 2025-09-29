// apps/api/utils/supabaseAdmin.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn("[ADMIN] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Admin endpoints will fail.");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
