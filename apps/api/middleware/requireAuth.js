import { supabase } from '../utils/supabaseClient.js';

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  console.log("[requireAuth] Auth header:", auth ? "Present" : "Missing");
  console.log("[requireAuth] Token extracted:", token ? "Yes" : "No");
  
  if (!token) return res.status(401).json({ error: 'Missing token' });

  // Check if Supabase is available
  if (!supabase) {
    console.error("[requireAuth] Supabase not available, cannot authenticate");
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    console.log("[requireAuth] Supabase getUser result:", { 
      hasUser: !!data?.user, 
      userId: data?.user?.id,
      error: error?.message 
    });
    
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    req.user = data.user; // { id, email, ... }
    console.log("[requireAuth] User set on request:", req.user?.id);
    next();
  } catch (err) {
    console.error("[requireAuth] Authentication error:", err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
