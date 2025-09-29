// apps/api/middleware/requireAdminUser.js
import { supabase } from "../utils/supabaseClient.js";

export async function requireAdminUser(req, res, next) {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin, banned")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data?.is_admin) return res.status(403).json({ error: "Admin only" });
    if (data?.banned) return res.status(403).json({ error: "Account is banned" });

    return next();
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Admin check failed" });
  }
}
