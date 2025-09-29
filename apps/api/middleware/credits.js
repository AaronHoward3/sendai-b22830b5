// apps/api/middleware/credits.js
import { supabase } from "../utils/supabaseClient.js";

// already have this for emails (leave as-is if you do)
export async function requireEmailCredit(req, res, next) {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    // Check if Supabase is available
    if (!supabase) {
      console.warn("[credits] Supabase not available, skipping credit check");
      return next();
    }

    const { data: ok, error } = await supabase.rpc("consume_credits_admin", {
      uid,
      p_emails: 1,
      p_images: 0,
      p_revisions: 0,
      p_reason: "email_generate",
    });

    if (error) return res.status(500).json({ error: error.message });
    if (!ok) return res.status(402).json({ error: "Not enough email credits" });
    next();
  } catch (e) {
    console.error("[credits] requireEmailCredit error:", e);
    res.status(500).json({ error: e.message || "Email credit check failed" });
  }
}

// NEW: only charge an image if we are going to generate a new one
export async function maybeConsumeImageCredit(req, res, next) {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    // Check if Supabase is available
    if (!supabase) {
      console.warn("[credits] Supabase not available, skipping image credit check");
      return next();
    }

    const wantsCustomHero = !!req.body?.customHeroImage;
    const hasSaved = !!req.body?.savedHeroImageId; // when user reuses an image, skip charging

    if (wantsCustomHero && !hasSaved) {
      const { data: ok, error } = await supabase.rpc("consume_credits_admin", {
        uid,
        p_emails: 0,
        p_images: 1,
        p_revisions: 0,
        p_reason: "image_generate",
      });
      if (error) return res.status(500).json({ error: error.message });
      if (!ok) return res.status(402).json({ error: "Not enough image credits" });
    }
    next();
  } catch (e) {
    console.error("[credits] maybeConsumeImageCredit error:", e);
    res.status(500).json({ error: e.message || "Image credit check failed" });
  }
}