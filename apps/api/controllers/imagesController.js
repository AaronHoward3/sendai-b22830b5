// apps/api/controllers/imagesController.js
import { supabase } from "../utils/supabaseClient.js";

// === Config ===
// Keep bucket consistent with the generator's imageUploadService (default to image-hosting-braanddev)
const BUCKET = process.env.SUPABASE_IMAGES_BUCKET || "image-hosting-braanddev";

// --- utils ---
function normDomain(d) {
  const raw = String(d || "").trim().toLowerCase();
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.host;
  } catch {
    const noProto = raw.replace(/^https?:\/\//i, "");
    const slash = noProto.indexOf("/");
    return slash === -1 ? noProto : noProto.slice(0, slash);
  }
}
function safeSeg(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function guessExtFromContentType(ct = "") {
  const m = String(ct).toLowerCase();
  if (m.includes("image/png")) return "png";
  if (m.includes("image/webp")) return "webp";
  if (m.includes("image/jpeg") || m.includes("image/jpg")) return "jpg";
  if (m.includes("image/gif")) return "gif";
  return "png";
}
function guessExtFromUrl(u = "") {
  try {
    const p = new URL(u);
    const name = p.pathname.split("/").pop() || "";
    const ext = name.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
    return "";
  } catch {
    return "";
  }
}

async function ensureBucket() {
  try {
    // Will throw if using anon key; make sure server uses service role key
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    if (error && (error.message || "").toLowerCase().includes("not found")) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "20MB",
      });
      if (createErr) throw createErr;
      console.log(`[API] Storage bucket created: ${BUCKET}`);
    }
  } catch (e) {
    // Not fatal; upload will surface a clearer error if it truly fails
    console.warn(`[API] ensureBucket warning for "${BUCKET}":`, e?.message || e);
  }
}

// === List images for a domain (used by Settings + Step 2) ===
export async function listMyImagesByDomain(req, res) {
  const uid = req.user?.id;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const domain = normDomain(req.query.domain || req.params.domain);
  if (!domain) return res.status(400).json({ error: "domain required" });

  const { data, error } = await supabase
    .from("user_images")
    .select("id, public_url, path, created_at, width, height")
    .eq("user_id", uid)
    .eq("domain", domain)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ images: data || [] });
}

// === Save from a remote URL ===
export async function storeUserImageFromUrl({ userId, domain, url }) {
  if (!userId || !domain || !url) throw new Error("Missing userId/domain/url");
  const d = normDomain(domain);
  const u = String(url).trim();

  // Fetch the remote image
  const resp = await fetch(u);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  const buf = Buffer.from(await resp.arrayBuffer());

  // Build storage path - use bucket name in path for consistency
  const ext = guessExtFromUrl(u) || guessExtFromContentType(ct);
  const objectPath = `${BUCKET}/${safeSeg(userId)}/${safeSeg(d)}/${Date.now()}.${ext}`;

  // Ensure bucket exists, then upload (retry once if bucket-not-found)
  await ensureBucket();

  let upErr = null;
  let uploaded = null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: ct || `image/${ext}`, cacheControl: "31536000", upsert: false });
    uploaded = data;
    upErr = error || null;
  } catch (e) {
    upErr = e;
  }

  if (upErr && /bucket.*not.*found/i.test(String(upErr?.message || upErr))) {
    await ensureBucket();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: ct || `image/${ext}`, cacheControl: "31536000", upsert: false });
    uploaded = data;
    upErr = error || null;
  }

  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const public_url = pub?.publicUrl;

  const { data, error } = await supabase
    .from("user_images")
    .insert({ user_id: userId, domain: d, path: objectPath, public_url })
    .select()
    .single();

  if (error) throw error;
  return data; // { id, public_url, ... }
}

// === Save from a data URL ===
export async function storeUserImageFromDataUrl({ userId, domain, dataUrl }) {
  if (!userId || !domain || !dataUrl) throw new Error("Missing userId/domain/dataUrl");
  const d = normDomain(domain);

  // Parse data URL
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) throw new Error("Invalid data URL");
  const ct = m[1] || "image/png";
  const buf = Buffer.from(m[2], "base64");
  const ext = guessExtFromContentType(ct);
  const objectPath = `${BUCKET}/${safeSeg(userId)}/${safeSeg(d)}/${Date.now()}.${ext}`;

  await ensureBucket();

  let upErr = null;
  let uploaded = null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: ct, cacheControl: "31536000", upsert: false });
    uploaded = data;
    upErr = error || null;
  } catch (e) {
    upErr = e;
  }

  if (upErr && /bucket.*not.*found/i.test(String(upErr?.message || upErr))) {
    await ensureBucket();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: ct, cacheControl: "31536000", upsert: false });
    uploaded = data;
    upErr = error || null;
  }

  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const public_url = pub?.publicUrl;

  const { data, error } = await supabase
    .from("user_images")
    .insert({ user_id: userId, domain: d, path: objectPath, public_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}
