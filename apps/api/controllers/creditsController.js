import { supabase } from "../utils/supabaseClient.js";

function normDomain(d) {
  return String(d || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

// GET /api/credits/me
export async function getMyCredits(req, res) {
  const uid = req.user.id;
  const [{ data: bal, error: bErr }, { count, error: cErr }] = await Promise.all([
    supabase
      .from("credit_balances")
      .select("emails_remaining,images_remaining,revisions_remaining,brand_limit,updated_at")
      .eq("user_id", uid)
      .maybeSingle(),
    supabase.from("user_brands").select("domain", { count: "exact", head: true }).eq("user_id", uid),
  ]);

  if (bErr || cErr) return res.status(500).json({ error: (bErr || cErr)?.message });
  res.json({
    balance: bal ?? { emails_remaining: 0, images_remaining: 0, revisions_remaining: 0, brand_limit: 0, updated_at: null },
    brand_count: typeof count === "number" ? count : 0,
  });
}

// POST /api/credits/consume { emails?, images?, revisions?, reason? }
export async function consumeCredits(req, res) {
  const uid = req.user.id;
  const { emails = 0, images = 0, revisions = 0, reason = "consume" } = req.body || {};

  if (![emails, images, revisions].every((n) => Number.isInteger(n) && n >= 0))
    return res.status(400).json({ error: "emails/images/revisions must be non-negative integers" });
  if (emails + images + revisions === 0)
    return res.status(400).json({ error: "nothing to consume" });

  const { data: ok, error } = await supabase.rpc("consume_credits_admin", {
    uid,
    p_emails: emails,
    p_images: images,
    p_revisions: revisions,
    p_reason: reason,
  });

  if (error) return res.status(500).json({ error: error.message });
  if (!ok) return res.status(402).json({ error: "Insufficient credits" });

  const { data: bal } = await supabase
    .from("credit_balances")
    .select("emails_remaining,images_remaining,revisions_remaining,brand_limit,updated_at")
    .eq("user_id", uid)
    .maybeSingle();

  res.json({ ok: true, balance: bal });
}

// POST /api/credits/claim-brand { domain }
export async function claimBrand(req, res) {
  const uid = req.user.id;
  const domain = normDomain(req.body?.domain);
  if (!domain) return res.status(400).json({ error: "domain required" });

  // ✅ If user already owns this domain, treat as success (idempotent)
  const { data: existing, error: exErr } = await supabase
    .from("user_brands")
    .select("id")
    .eq("user_id", uid)
    .eq("domain", domain)
    .maybeSingle();

  if (!exErr && existing) {
    return res.json({ ok: true, domain, alreadyOwned: true });
  }

  const { data: ok, error } = await supabase.rpc("claim_brand_admin", { uid, p_domain: domain });
  if (error) return res.status(500).json({ error: error.message });

  if (!ok) {
    return res.status(402).json({
      code: "NO_BRAND_SLOTS",
      error: "Brand limit reached. Upgrade your plan to add more brands."
    });
  }

  res.json({ ok: true, domain });
}
