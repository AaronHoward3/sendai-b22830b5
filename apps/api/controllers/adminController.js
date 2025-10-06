// apps/api/controllers/adminController.js
import { supabase } from "../utils/supabaseClient.js";
import { supabaseAdmin } from "../utils/supabaseAdmin.js"; // service role client

function normalizeDomain(input = "") {
  const raw = String(input || "").trim().toLowerCase();
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.host;
  } catch {
    const noProto = raw.replace(/^https?:\/\//i, "");
    const slash = noProto.indexOf("/");
    return slash === -1 ? noProto : noProto.slice(0, slash);
  }
}

const CREDIT_FIELDS = ["emails_remaining", "images_remaining", "revisions_remaining", "brand_limit"];

/** GET /api/admin/users?page=1&perPage=50
 *  Lists users (paginated) with joined profile flags, credit balances, and brand counts.
 */
export async function adminListUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 50));

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return res.status(500).json({ error: error.message });

    const users = data?.users || [];
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return res.json({ users: [], page, perPage, hasMore: false });

    const [{ data: profs }, { data: bals }, { data: brandRows }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, is_admin, banned").in("user_id", ids),
      supabase
        .from("credit_balances")
        .select("user_id, emails_remaining, images_remaining, revisions_remaining, brand_limit, updated_at")
        .in("user_id", ids),
      supabase.from("user_brands").select("user_id").in("user_id", ids),
    ]);

    const profMap = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
    const balMap = Object.fromEntries((bals || []).map((b) => [b.user_id, b]));
    const brandCount = {};
    for (const r of brandRows || []) brandCount[r.user_id] = (brandCount[r.user_id] || 0) + 1;

    const out = users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      display_name: profMap[u.id]?.display_name ?? null,
      is_admin: !!profMap[u.id]?.is_admin,
      banned: !!profMap[u.id]?.banned,
      brand_count: brandCount[u.id] ?? 0,
      balance: balMap[u.id] || null,
    }));

    // If the admin API returns paging info, prefer it; otherwise, fall back to length check.
    const hasMore = typeof data?.nextPage === "number" ? data.nextPage > page : users.length === perPage;

    return res.json({ users: out, page, perPage, hasMore });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "List users failed" });
  }
}

/** GET /api/admin/users/search?email=&id=&domain= */
export async function adminSearchUsers(req, res) {
  const { email, id, domain } = req.query || {};

  try {
    // 1) By user id
    if (id) {
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, is_admin, banned")
        .eq("user_id", id)
        .maybeSingle();
      if (pErr) return res.status(500).json({ error: pErr.message });

      // auth row
      const user = await supabaseAdmin.auth.admin.getUserById(id).then(r => r.data?.user || null);
      if (!user && !prof) return res.json({ users: [] });

      const { data: bal } = await supabase
        .from("credit_balances")
        .select("emails_remaining,images_remaining,revisions_remaining,brand_limit,updated_at")
        .eq("user_id", id)
        .maybeSingle();

      const { count: brandCount } = await supabase
        .from("user_brands")
        .select("domain", { count: "exact", head: true })
        .eq("user_id", id);

      return res.json({
        users: [{
          id,
          email: user?.email ?? null,
          created_at: user?.created_at ?? null,
          last_sign_in_at: user?.last_sign_in_at ?? null,
          display_name: prof?.display_name ?? null,
          is_admin: !!prof?.is_admin,
          banned: !!prof?.banned,
          brand_count: brandCount ?? 0,
          balance: bal ?? null,
        }]
      });
    }

    // 2) By email (exact/partial)
    if (email) {
      // Use Admin API (service role) to list+filter
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });
      const q = String(email).toLowerCase();
      const matches = (list?.users || []).filter(u =>
        (u.email || "").toLowerCase().includes(q)
      );

      const ids = matches.map(u => u.id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, is_admin, banned")
        .in("user_id", ids);

      const profMap = Object.fromEntries((profs || []).map(p => [p.user_id, p]));
      const { data: bals } = await supabase
        .from("credit_balances")
        .select("user_id,emails_remaining,images_remaining,revisions_remaining,brand_limit,updated_at")
        .in("user_id", ids);

      const balMap = Object.fromEntries((bals || []).map(b => [b.user_id, b]));

      // brand counts
      const counts = {};
      for (const uid of ids) {
        const { count } = await supabase
          .from("user_brands")
          .select("domain", { count: "exact", head: true })
          .eq("user_id", uid);
        counts[uid] = count ?? 0;
      }

      return res.json({
        users: matches.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          display_name: profMap[u.id]?.display_name ?? null,
          is_admin: !!profMap[u.id]?.is_admin,
          banned: !!profMap[u.id]?.banned,
          brand_count: counts[u.id] ?? 0,
          balance: balMap[u.id] ?? null,
        }))
      });
    }

    // 3) By brand domain
    if (domain) {
      const d = normalizeDomain(domain);
      // Prefer user_brands; fallback to emails table
      const { data: owners } = await supabase
        .from("user_brands")
        .select("user_id")
        .eq("domain", d);

      let ids = (owners || []).map(r => r.user_id);
      if (ids.length === 0) {
        const { data: rows } = await supabase
          .from("emails")
          .select("user_id")
          .eq("brand_domain", d);
        ids = Array.from(new Set((rows || []).map(r => r.user_id)));
      }
      if (ids.length === 0) return res.json({ users: [] });

      // auth + profiles + balances
      const users = [];
      for (const uid of ids) {
        const user = await supabaseAdmin.auth.admin.getUserById(uid).then(r => r.data?.user || null);
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, is_admin, banned")
          .eq("user_id", uid)
          .maybeSingle();
        const { data: bal } = await supabase
          .from("credit_balances")
          .select("emails_remaining,images_remaining,revisions_remaining,brand_limit,updated_at")
          .eq("user_id", uid)
          .maybeSingle();
        const { count } = await supabase
          .from("user_brands")
          .select("domain", { count: "exact", head: true })
          .eq("user_id", uid);
        users.push({
          id: uid,
          email: user?.email ?? null,
          created_at: user?.created_at ?? null,
          last_sign_in_at: user?.last_sign_in_at ?? null,
          display_name: prof?.display_name ?? null,
          is_admin: !!prof?.is_admin,
          banned: !!prof?.banned,
          brand_count: count ?? 0,
          balance: bal ?? null,
        });
      }
      return res.json({ users });
    }

    return res.status(400).json({ error: "Provide one of: email, id, domain" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
}

/** GET /api/admin/users/:userId/snapshot */
export async function adminGetUserSnapshot(req, res) {
  const { userId } = req.params;
  try {
    const user = await supabaseAdmin.auth.admin.getUserById(userId).then(r => r.data?.user || null);

    const [{ data: prof }, { data: bal }, { data: brands }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("credit_balances").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_brands").select("domain, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const { data: images } = await supabase
      .from("user_images")
      .select("id, domain, public_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: emails } = await supabase
      .from("emails")
      .select("id, subject, brand_domain, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return res.json({
      user: {
        id: userId,
        email: user?.email ?? null,
        created_at: user?.created_at ?? null,
        last_sign_in_at: user?.last_sign_in_at ?? null,
      },
      profile: prof ?? null,
      balance: bal ?? null,
      brands: brands ?? [],
      images: images ?? [],
      emails: emails ?? [],
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Snapshot failed" });
  }
}

/** PATCH /api/admin/users/:userId/credits  { set?:{}, add?:{} } */
export async function adminPatchCredits(req, res) {
  const { userId } = req.params;
  const body = req.body || {};
  const setObj = body.set || {};
  const addObj = body.add || {};

  try {
    const { data: current, error: readErr } = await supabase
      .from("credit_balances")
      .select("emails_remaining,images_remaining,revisions_remaining,brand_limit")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) return res.status(500).json({ error: readErr.message });

    const updates = {};
    for (const f of CREDIT_FIELDS) if (setObj[f] != null) updates[f] = Number(setObj[f]);
    if (Object.keys(addObj).length) {
      const base = current || { emails_remaining: 0, images_remaining: 0, revisions_remaining: 0, brand_limit: 0 };
      for (const f of CREDIT_FIELDS) {
        if (addObj[f] != null) {
          updates[f] = (updates[f] ?? Number(base[f] ?? 0)) + Number(addObj[f]);
        }
      }
    }
    for (const f of Object.keys(updates)) {
      const v = Math.floor(Number(updates[f] ?? 0));
      updates[f] = v < 0 ? 0 : v;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to change" });

    const row = { user_id: userId, ...updates, updated_at: new Date().toISOString() };
    const { data, error: upErr } = await supabase
      .from("credit_balances")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (upErr) return res.status(500).json({ error: upErr.message });
    return res.json({ ok: true, balance: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Patch credits failed" });
  }
}

/** POST /api/admin/users/:userId/reset-credits - Reset credits to match current subscription */
export async function adminResetCreditsToPlan(req, res) {
  const { userId } = req.params;
  
  try {
    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('price_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError) return res.status(500).json({ error: subError.message });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found for this user' });
    }
    
    if (subscription.status !== 'active') {
      return res.status(400).json({ error: `Subscription status is '${subscription.status}', not 'active'` });
    }
    
    if (!subscription.price_id) {
      return res.status(400).json({ error: 'No price_id found in subscription' });
    }
    
    // Import stripe client
    const { stripe } = await import('../utils/stripeClient.js');
    
    // Get allowances for this price
    const price = await stripe.prices.retrieve(subscription.price_id);
    const m = price.metadata || {};
    const allowances = {
      emails: parseInt(m.emails || '0', 10),
      images: parseInt(m.images || '0', 10),
      revisions: parseInt(m.revisions || '0', 10),
      brand_limit: parseInt(m.brand_limit || '0', 10)
    };
    
    // Reset credits to match plan
    const { data: existing } = await supabase.from('credit_balances').select('*').eq('user_id', userId).maybeSingle();
    const row = existing || { user_id: userId };
    row.emails_remaining = allowances.emails;
    row.images_remaining = allowances.images;
    row.revisions_remaining = allowances.revisions;
    row.brand_limit = allowances.brand_limit;
    row.updated_at = new Date().toISOString();

    await supabase.from('credit_balances').upsert(row);
    await supabase.from('credit_ledger').insert({
      user_id: userId,
      delta_emails: allowances.emails,
      delta_images: allowances.images,
      delta_revisions: allowances.revisions,
      reason: 'reset',
      source: 'admin_reset_to_plan'
    });
    
    return res.json({ 
      ok: true, 
      message: 'Credits reset to match current plan',
      allowances,
      plan: price.nickname || subscription.price_id
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/** PATCH /api/admin/users/:userId/account  { email?, display_name?, is_admin?, banned? } */
export async function adminPatchAccount(req, res) {
  const { userId } = req.params;
  const { email, display_name, is_admin, banned } = req.body || {};
  try {
    // profiles updates
    const profUpdates = {};
    if (display_name !== undefined) profUpdates.display_name = display_name;
    if (typeof is_admin === "boolean") profUpdates.is_admin = is_admin;
    if (typeof banned === "boolean") profUpdates.banned = banned;

    if (Object.keys(profUpdates).length) {
      profUpdates.updated_at = new Date().toISOString();
      await supabase
        .from("profiles")
        .upsert({ user_id: userId, ...profUpdates }, { onConflict: "user_id" });
    }

    // auth email update (service role)
    if (email) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { email });
    }

    // return fresh snapshot
    return adminGetUserSnapshot(req, res);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Patch account failed" });
  }
}

/** POST /api/admin/users/:userId/ban  { reason? } */
export async function adminBanUser(req, res) {
  req.body = { ...(req.body || {}), banned: true };
  return adminPatchAccount(req, res);
}

/** POST /api/admin/users/:userId/unban */
export async function adminUnbanUser(req, res) {
  req.body = { ...(req.body || {}), banned: false };
  return adminPatchAccount(req, res);
}

/** POST /api/admin/users/:userId/clean-data
 *  Removes all user data (brands, emails, images, etc.) but preserves subscription
 */
export async function adminCleanUserData(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // Get user's UUID from the user ID
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user?.user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userUuid = user.user.id;

    // Delete user's data in order (respecting foreign key constraints)
    const deletions = [
      // Delete generated emails
      supabaseAdmin.from('generated_emails').delete().eq('user_id', userUuid),
      
      // Delete saved images
      supabaseAdmin.from('saved_images').delete().eq('user_id', userUuid),
      
      // Delete user-specific brand data
      supabaseAdmin.from('user_brands').delete().eq('user_id', userUuid),
      
      // Delete user-specific image data
      supabaseAdmin.from('user_images').delete().eq('user_id', userUuid),
      
      // Delete credit ledger entries (but preserve subscription)
      supabaseAdmin.from('credit_ledger').delete().eq('user_id', userUuid),
      
      supabaseAdmin.from('emails').delete().eq('user_id', userUuid),
      
      // Delete brands (this will cascade to brand_products, brand_colors, etc.)
      supabaseAdmin.from('brands').delete().eq('user_id', userUuid),
      
      // Delete any other user-specific data
      supabaseAdmin.from('user_preferences').delete().eq('user_id', userUuid),
      
      // Delete trial usage data
      supabaseAdmin.from('trial_usage').delete().eq('user_id', userUuid),
    ];

    // Execute all deletions
    const results = await Promise.allSettled(deletions);
    
    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some deletions failed:', failures);
      // Continue anyway as some tables might not exist
    }

    // Return success response
    return res.json({ 
      success: true, 
      message: "User data cleaned successfully",
      deletedTables: ['generated_emails', 'saved_images', 'user_brands', 'user_images', 'credit_ledger', 'brands', 'user_preferences', 'trial_usage']
    });

  } catch (e) {
    console.error('Clean user data error:', e);
    return res.status(500).json({ error: e?.message || "Clean data failed" });
  }
}
