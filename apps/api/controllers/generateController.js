import { getStoredBrand } from "../utils/dataStore.js";
import mjml2html from "mjml";
import path from "node:path";
import fs from "node:fs/promises";
import { storeUserImageFromUrl, storeUserImageFromDataUrl } from "./imagesController.js";
import { supabase } from "../utils/supabaseClient.js";

// ---- helpers to avoid heavy regex on untrusted strings ----
function trimTrailingSlashes(p) {
  let out = String(p || "");
  while (out.endsWith("/") && out.length > 1) out = out.slice(0, -1);
  return out;
}
function normalizeUrl(u = "") {
  try {
    const url = new URL(String(u).trim());
    url.pathname = trimTrailingSlashes(url.pathname);
    return url.toString();
  } catch {
    const s = String(u || "").trim();
    return trimTrailingSlashes(s);
  }
}
function safeSlice(s, max = 65536) {
  // bound the haystack so any regex scans stay linear-time in practice
  return String(s || "").slice(0, max);
}

function normalizeDomain(input) {
  const raw = String(input || "").trim().toLowerCase();
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    // strip first path segment entirely without regex
    return u.host;
  } catch {
    // manual fallback
    const noProto = raw.replace(/^https?:\/\//i, "");
    const slash = noProto.indexOf("/");
    return slash === -1 ? noProto : noProto.slice(0, slash);
  }
}

const COLOR_KEYS = [
  "primary_color",
  "link_color",
  "header_color",
  "body_color",
  "text_color",
  "button_color",
  "button_text_color",
  "button_border_color",
];

function pickColors(obj = {}) {
  const out = {};
  for (const k of COLOR_KEYS) if (obj[k]) out[k] = obj[k];
  return out;
}

function resolveEffectiveColors(brandJson) {
  const bd = brandJson?.brandData || {};
  const top = pickColors(brandJson);
  const under = pickColors(bd);
  const resolved = {};
  for (const k of COLOR_KEYS) resolved[k] = top[k] ?? under[k] ?? null;
  return { top, under, resolved };
}

// Pull a likely hero image URL from several places (MJML and compiled HTML)
// Regexes are constant (not user-controlled) and run on bounded strings via safeSlice().
function extractHeroUrl({ generated, headerHero, mjml, html }) {
  const candidates = [];

  // 1) Direct signals
  if (typeof generated?.heroImageUrlUsed === "string") candidates.push(generated.heroImageUrlUsed);
  if (typeof headerHero === "string") candidates.push(headerHero);

  // 2) MJML-side clues (before compile)
  if (typeof mjml === "string" && mjml) {
    const s = safeSlice(mjml);
    // <mj-section background-url="..."> / <mj-hero background-url="...">
    const bgAttr = s.match(/background-url=["']([^"']+)["']/i);
    if (bgAttr?.[1]) candidates.push(bgAttr[1]);

    // Legacy MJML background="https://..."
    const bgAttr2 = s.match(/\bbackground=["'](https?:\/\/[^"']+)["']/i);
    if (bgAttr2?.[1]) candidates.push(bgAttr2[1]);

    // Inline CSS url(...)
    const cssUrl = s.match(/url\((?:"|')?(https?:\/\/[^'")]+)(?:"|')?\)/i); // no backrefs
    if (cssUrl?.[1]) candidates.push(cssUrl[1]);

    // Any <img src="..."> in MJML
    const imgMj = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMj?.[1]) candidates.push(imgMj[1]);

    // Data attributes sometimes used by templates
    const dataBg = s.match(/\bdata-(?:bg|background|background-image)=["'](https?:\/\/[^"']+)["']/i);
    if (dataBg?.[1]) candidates.push(dataBg[1]);
  }

  // 3) Compiled HTML-side clues (after mjml2html)
  if (typeof html === "string" && html) {
    const s = safeSlice(html);
    // First <img src="...">
    const imgHtml = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgHtml?.[1]) candidates.push(imgHtml[1]);

    // CSS background-image: url(...)
    const cssHtml = s.match(/background(?:-image)?:\s*url\((?:"|')?(https?:\/\/[^'")]+)(?:"|')?\)/i);
    if (cssHtml?.[1]) candidates.push(cssHtml[1]);

    // HTML attribute background="https://..."
    const htmlBgAttr = s.match(/\bbackground=["'](https?:\/\/[^"']+)["']/i);
    if (htmlBgAttr?.[1]) candidates.push(htmlBgAttr[1]);

    // Outlook VML: <v:fill src="https://...">
    const vmlFill = s.match(/<v:fill[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (vmlFill?.[1]) candidates.push(vmlFill[1]);

    // srcset (take the first URL)
    const srcset = s.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcset?.[1]) {
      const first = srcset[1].split(",")[0]?.trim().split(" ")[0];
      if (first) candidates.push(first);
    }
  }

  // Filter placeholders / invalids / duplicates
  const seen = new Set();
  for (const u of candidates) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    if (/CUSTOMHEROIMAGE\.COM|SAVEDHEROIMAGE\.COM/i.test(u)) continue;
    if (!/^https?:\/\//i.test(u) && !String(u).startsWith("data:")) continue;
    return u;
  }
  return null;
}

export async function generateEmails(req, res) {
  console.log("🎯 [CONTROLLER] generateEmails started");
  const startTime = Date.now();
  const isPreviewMode = req.isPreviewMode || false;

  try {
    console.log("🎯 [CONTROLLER] Extracting request body...");
    const {
      domain,
      emailType,
      userContext,
      imageContext,
      tone,
      customHeroImage,
      designAesthetic,
      products,
      savedHeroImageUrl, // pass-through for reusing a saved image
      savedHeroImageId,  // reserved for future id->url resolution
    } = req.body || {};

    console.log("🎯 [CONTROLLER] Request data:", {
      domain,
      emailType,
      tone,
      designAesthetic,
      customHeroImage,
      hasProducts: !!products,
      hasSavedHeroImageUrl: !!savedHeroImageUrl,
      hasSavedHeroImageId: !!savedHeroImageId
    });

    if (!domain) {
      console.error("❌ [CONTROLLER] Domain is required");
      return res.status(400).json({ error: "Domain is required" });
    }

    console.log("🎯 [CONTROLLER] Normalizing domain...");
    const normalizedDomain = normalizeDomain(domain);
    console.log("🎯 [CONTROLLER] Normalized domain:", normalizedDomain);

    console.log("🎯 [CONTROLLER] Getting stored brand...");
    const existing = await getStoredBrand(normalizedDomain);
    console.log("🎯 [CONTROLLER] Brand lookup result:", !!existing?.brand);
    
    let brandJson;
    
    if (!existing?.brand) {
      console.error("❌ [CONTROLLER] Brand info not found for domain:", normalizedDomain);
      
      // For preview mode, create a fallback brand to allow generation
      if (isPreviewMode) {
        console.log("🎯 [CONTROLLER] Creating fallback brand for preview mode");
        const fallbackBrand = {
          name: normalizedDomain,
          domain: normalizedDomain,
          website: `https://${normalizedDomain}`,
          description: `Brand for ${normalizedDomain}`,
          primary_color: "#4f46e5",
          link_color: "#22d3ee",
          logo: null,
          logo_url: null, // Header service looks for this field
          store_name: normalizedDomain, // Header service looks for this field
          store_url: `https://${normalizedDomain}`, // Header service looks for this field
          products: [],
          brandData: {
            products: [
              {
                title: "Sample Product",
                subtitle: "This is a sample product for demonstration purposes",
                price: "$29.99",
                imageUrl: "",
                buttonText: "View",
                buttonUrl: `https://${normalizedDomain}/products/sample`
              }
            ],
            description: `Brand for ${normalizedDomain}`,
            primary_color: "#4f46e5",
            link_color: "#22d3ee",
          }
        };
        brandJson = structuredClone(fallbackBrand);
        console.log("🎯 [CONTROLLER] Using fallback brand for preview generation");
      } else {
        return res.status(404).json({ error: "Brand info not found for domain", domain: normalizedDomain });
      }
    } else {
      // Use existing brand data
      brandJson = structuredClone(existing.brand);
      
      // Ensure required fields for headers and footers
      if (!brandJson.store_name) {
        brandJson.store_name = brandJson.name || normalizedDomain;
      }
      if (!brandJson.store_url) {
        brandJson.store_url = brandJson.website || `https://${normalizedDomain}`;
      }
      if (!brandJson.logo_url) {
        brandJson.logo_url = brandJson.logo || null;
      }
    }

    // Build payload for generator (common logic for both cases)
    brandJson.emailType = emailType || "";
    brandJson.userContext = userContext || "";
    brandJson.imageContext = imageContext || "";
    brandJson.tone = tone || "";
    brandJson.designAesthetic = designAesthetic || "";
    brandJson.brandData = brandJson.brandData || {};
    brandJson.brandData.customHeroImage = customHeroImage ?? true;
    brandJson.customHeroImage = customHeroImage ?? true; // Also set at top level for generator
    
    // Ensure required fields are at the top level for generator services
    if (!brandJson.store_name) {
      brandJson.store_name = brandJson.brandData?.store_name || brandJson.name || normalizedDomain;
    }
    if (!brandJson.store_url) {
      brandJson.store_url = brandJson.brandData?.store_url || brandJson.website || `https://${normalizedDomain}`;
    }
    if (!brandJson.logo_url) {
      brandJson.logo_url = brandJson.brandData?.logo_url || brandJson.logo || null;
    }
    // Normalize products to match generator expectations
    console.log("🔍 [DEBUG] Raw products before normalization:", products?.slice(0, 2));
    const normalizedProducts = Array.isArray(products) ? products.map(p => ({
      title: p.name || p.title || '',
      subtitle: p.description || p.subtitle || '',
      price: p.price || '',
      imageUrl: p.image_url || p.imageUrl || p.image || '',
      buttonText: p.buttonText || 'View',
      buttonUrl: p.url || p.buttonUrl || p.buttonURL || ''
    })) : (brandJson.brandData.products || []);
    console.log("🔍 [DEBUG] Normalized products:", normalizedProducts?.slice(0, 2));
    
    brandJson.brandData.products = normalizedProducts;
    brandJson.products = normalizedProducts; // Also put products at top level for generator

    // Forward saved image to generator -> it will inject and skip generating
    if (typeof savedHeroImageUrl === "string" && /^https?:\/\//i.test(savedHeroImageUrl.trim())) {
      brandJson.savedHeroImageUrl = savedHeroImageUrl.trim();
      brandJson.brandData.customHeroImage = false;
    }

    // propagate colors to top-level for back-compat
    for (const key of COLOR_KEYS) if (brandJson.brandData[key]) brandJson[key] = brandJson.brandData[key];

    const { resolved } = resolveEffectiveColors(brandJson);
    brandJson.theme = { ...(brandJson.theme || {}), primaryColor: brandJson.primary_color, linkColor: brandJson.link_color };
    brandJson.styles = { ...(brandJson.styles || {}), primary_color: brandJson.primary_color, link_color: brandJson.link_color };
    brandJson.debug = { ...(brandJson.debug || {}), effectiveColors: resolved, designAesthetic: brandJson.designAesthetic, emailType: brandJson.emailType };

    if (process.env.LOG_GENERATOR_PAYLOAD === "1") {
      try {
        const outPath = path.join(process.cwd(), "__debug_last_generator_payload.json");
        await fs.writeFile(outPath, JSON.stringify(brandJson, null, 2), "utf8");
        console.log(`[generateController] wrote payload to ${outPath}`);
      } catch (e) {
        console.warn("[generateController] failed to write payload:", e.message);
      }
    }

    // ---- Call Generator ----
    console.log("[generateController] Forwarding to Generator...");
    
    // Debug the final brand data structure
    console.log("🔍 [DEBUG] Final brand data structure:");
    console.log("🔍 [DEBUG] hasStoreName:", !!brandJson.store_name);
    console.log("🔍 [DEBUG] hasStoreUrl:", !!brandJson.store_url);
    console.log("🔍 [DEBUG] hasLogoUrl:", !!brandJson.logo_url);
    console.log("🔍 [DEBUG] hasProducts:", !!brandJson.products);
    console.log("🔍 [DEBUG] productsLength:", brandJson.products?.length || 0);
    console.log("🔍 [DEBUG] storeName:", brandJson.store_name);
    console.log("🔍 [DEBUG] storeUrl:", brandJson.store_url);
    console.log("🔍 [DEBUG] logoUrl:", brandJson.logo_url);
    console.log("🔍 [DEBUG] products preview:", brandJson.products?.slice(0, 2));
    
    if (!process.env.GENERATOR_URL) {
      console.error("[generateController] GENERATOR_URL not configured");
      return res.status(500).json({ error: "Generator service not configured" });
    }
    
    console.log("🎯 [CONTROLLER] Generator URL:", process.env.GENERATOR_URL);
    console.log("🎯 [CONTROLLER] Brand JSON payload size:", JSON.stringify(brandJson).length);
    
    const genStart = Date.now();
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        brandData: brandJson,
        emailType: brandJson.emailType,
        userContext: brandJson.userContext,
        imageContext: brandJson.imageContext,
        designAesthetic: brandJson.designAesthetic,
        styleId: brandJson.designAesthetic,
        savedHeroImageUrl: brandJson.savedHeroImageUrl
      }),
    });
    console.log(`[generateController] Generator responded in ${Date.now() - genStart} ms`);

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      const errorText = await generatorResponse.text().catch(() => "Unknown error");
      console.error("[generateController] Generator error:", errorText);
      return res.status(500).json({ error: "Email generator failed", status: generatorResponse.status });
    }

    console.log("🎯 [CONTROLLER] Generator response OK, parsing JSON...");
    const headerHero = generatorResponse.headers.get("x-hero-image-url-used") || null;
    let generated;
    try {
      generated = await generatorResponse.json();
      console.log("🎯 [CONTROLLER] Generator JSON parsed successfully");
    } catch (parseError) {
      console.error("[generateController] Failed to parse generator response:", parseError);
      return res.status(500).json({ error: "Invalid response from generator service" });
    }

    // Compile MJML -> HTML
    const htmlEmails = (generated.emails || []).map((email) => {
      const compiled = mjml2html(email.content || "");
      let html = compiled.html || "";
      if (process.env.DEBUG_COLORS === "1") {
        const cmt = `<!-- DEBUG_COLORS primary=${resolved.primary_color} link=${resolved.link_color} designAesthetic=${brandJson.designAesthetic} -->`;
        html = cmt + "\n" + html;
      }
      return { ...email, html };
    });

    // ===== Persist the image actually used (with de-dupe by URL) =====
    let savedHero = null;
    try {
      const uid = req.user?.id; // requireAuth sets this
      const mjml = htmlEmails?.[0]?.content || generated?.emails?.[0]?.content || "";
      const html = htmlEmails?.[0]?.html || "";
      const extractedUrl = extractHeroUrl({ generated, headerHero, mjml, html });
      const urlToStore = extractedUrl ? normalizeUrl(extractedUrl) : null;
      const selectedUrl = savedHeroImageUrl ? normalizeUrl(savedHeroImageUrl) : null;

      console.log("[generateController] hero capture:", {
        hasUser: !!uid,
        domain: normalizedDomain,
        headerHero,
        hadExplicit: !!generated?.heroImageUrlUsed,
        foundFrom: urlToStore ? "extracted" : "none",
        selectedSaved: !!selectedUrl,
        urlPreview: urlToStore ? String(urlToStore).slice(0, 80) : null,
        isPreviewMode,
      });

      // Only proceed if we have a user + domain + a URL to store AND not in preview mode
      if (uid && normalizedDomain && urlToStore && !isPreviewMode) {
        // If user picked a saved image and it's the same link, just reuse existing DB row
        if (selectedUrl && selectedUrl === urlToStore) {
          const { data: existing } = await supabase
            .from("user_images")
            .select("id, public_url, path, created_at, width, height")
            .eq("user_id", uid)
            .eq("domain", normalizedDomain)
            .eq("public_url", extractedUrl) // use original (non-normalized) match first
            .maybeSingle();

          if (existing) {
            savedHero = existing;
          } else {
            // fallback: try normalized URL match
            const { data: existing2 } = await supabase
              .from("user_images")
              .select("id, public_url, path, created_at, width, height")
              .eq("user_id", uid)
              .eq("domain", normalizedDomain)
              .eq("public_url", urlToStore)
              .maybeSingle();
            if (existing2) savedHero = existing2;
          }
        }

        // If not found above, try generic de-dupe by URL
        if (!savedHero) {
          const { data: existing } = await supabase
            .from("user_images")
            .select("id, public_url, path, created_at, width, height")
            .eq("user_id", uid)
            .eq("domain", normalizedDomain)
            .eq("public_url", extractedUrl) // try exact first
            .maybeSingle();

          if (existing) {
            savedHero = existing;
          } else {
            const { data: existing2 } = await supabase
              .from("user_images")
              .select("id, public_url, path, created_at, width, height")
              .eq("user_id", uid)
              .eq("domain", normalizedDomain)
              .eq("public_url", urlToStore)
              .maybeSingle();

            if (existing2) {
              savedHero = existing2;
            }
          }
        }

        // Still not found? Only then upload/save.
        if (!savedHero) {
          if (extractedUrl.startsWith("data:")) {
            savedHero = await storeUserImageFromDataUrl({
              userId: uid,
              domain: normalizedDomain,
              dataUrl: extractedUrl,
            });
          } else if (/^https?:\/\//i.test(extractedUrl)) {
            savedHero = await storeUserImageFromUrl({
              userId: uid,
              domain: normalizedDomain,
              url: extractedUrl,
            });
          }
        }
      }
    } catch (e) {
      console.warn("[generateController] Hero image save skipped:", e?.message || e);
    }
    // ================================================================

    console.log(`[generateController] Total request time: ${Date.now() - startTime} ms`);
    
    const response = {
      success: true,
      subjectLine: generated.subjectLine || generated.subject || (htmlEmails[0]?.subject ?? ""),
      totalTokens: generated.totalTokens,
      emails: htmlEmails,
      savedHeroImage: savedHero ? { id: savedHero.id, url: savedHero.public_url } : null,
      heroImageUrlUsed: generated?.heroImageUrlUsed || headerHero || null,
      usedImageSource: generated?.heroImageUrlUsed ? (savedHeroImageUrl ? "saved" : "generated") : null,
      debug: { colorsSent: resolveEffectiveColors(brandJson).resolved },
    };

    // Add preview mode indicators
    if (isPreviewMode) {
      response.isPreviewMode = true;
      response.previewMessage = "This is a preview. Subscribe to access the full email and save it to your account.";
    }

    return res.json(response);
  } catch (err) {
    console.error("🚨 [CONTROLLER] Generate error:", err);
    console.error("🚨 [CONTROLLER] Error stack:", err.stack);
    console.error("🚨 [CONTROLLER] Error message:", err.message);
    return res.status(500).json({ error: "Failed to generate emails", details: err.message });
  }
}
