import { getStoredBrand } from "../utils/dataStore.js";
import mjml2html from "mjml";
import { storeUserImageFromUrl, storeUserImageFromDataUrl } from "./imagesController.js";
import { supabase } from "../utils/supabaseClient.js";
import { generateSubjectLine, generatePreviewSubjectLine } from '../services/subjectLineService.js';

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

  // 1) Direct signals - prioritize these as they're most reliable
  if (typeof generated?.heroImageUrl === "string") candidates.push(generated.heroImageUrl);
  if (typeof generated?.heroImageUrlUsed === "string") candidates.push(generated.heroImageUrlUsed);
  if (typeof headerHero === "string") candidates.push(headerHero);

  // 2) MJML-side clues (before compile) - Only extract hero images, not product images
  if (typeof mjml === "string" && mjml) {
    const s = safeSlice(mjml);
    
    // Only look for hero section background images, not product images
    // <mj-hero background-url="..."> - this is specifically for hero sections
    const heroBgAttr = s.match(/<mj-hero[^>]*background-url=["']([^"']+)["']/i);
    if (heroBgAttr?.[1]) candidates.push(heroBgAttr[1]);
    
    // <mj-section background-url="..."> but only in hero/header context
    const heroSectionBgAttr = s.match(/<mj-section[^>]*background-url=["']([^"']+)["'][^>]*>[\s\S]*?<\/mj-section>/i);
    if (heroSectionBgAttr?.[1]) {
      // Only include if it's likely a hero section (contains hero-related text or is early in the email)
      const sectionContent = heroSectionBgAttr[0];
      if (sectionContent.includes('hero') || sectionContent.includes('header') || 
          sectionContent.includes('welcome') || sectionContent.includes('main')) {
        candidates.push(heroSectionBgAttr[1]);
      }
    }

    // Legacy MJML background="https://..." but only for hero sections
    const heroBgAttr2 = s.match(/<mj-hero[^>]*background=["'](https?:\/\/[^"']+)["']/i);
    if (heroBgAttr2?.[1]) candidates.push(heroBgAttr2[1]);

    // Inline CSS url(...)
    const cssUrl = s.match(/url\((?:"|')?(https?:\/\/[^'")]+)(?:"|')?\)/i); // no backrefs
    if (cssUrl?.[1]) candidates.push(cssUrl[1]);

    // Only extract hero images from MJML - skip product images
    // Look for images in hero sections or with hero-related attributes
    const heroImgMj = s.match(/<mj-hero[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][\s\S]*?<\/mj-hero>/i);
    if (heroImgMj?.[1]) candidates.push(heroImgMj[1]);
    
    // Also check for images with hero-related data attributes
    const heroDataImgMj = s.match(/<img[^>]+data-hero=["']true["'][^>]+src=["']([^"']+)["']/i);
    if (heroDataImgMj?.[1]) candidates.push(heroDataImgMj[1]);

    // Data attributes sometimes used by templates
    const dataBg = s.match(/\bdata-(?:bg|background|background-image)=["'](https?:\/\/[^"']+)["']/i);
    if (dataBg?.[1]) candidates.push(dataBg[1]);
  }

  // 3) Compiled HTML-side clues (after mjml2html) - Only extract hero images
  if (typeof html === "string" && html) {
    const s = safeSlice(html);
    
    // Only extract images that are likely hero images (first image or in hero context)
    // Look for the first image in the HTML (usually the hero image)
    const firstImgHtml = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (firstImgHtml?.[1]) {
      // Only include if it's likely a hero image (not a product image)
      const imgContext = s.substring(0, s.indexOf(firstImgHtml[0]) + 1000); // Get context around the image
      if (!imgContext.includes('product') && !imgContext.includes('item') && 
          !imgContext.includes('price') && !imgContext.includes('buy')) {
        candidates.push(firstImgHtml[1]);
      }
    }

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

  // Filter placeholders / invalids / duplicates / product images
  const seen = new Set();
  for (const u of candidates) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    if (/CUSTOMHEROIMAGE\.COM|SAVEDHEROIMAGE\.COM/i.test(u)) continue;
    if (!/^https?:\/\//i.test(u) && !String(u).startsWith("data:")) continue;
    
    // Skip product images - look for common product image patterns
    if (/product|item|thumbnail|small|mini|cart|shop/i.test(u)) continue;
    
    return u;
  }
  return null;
}
export async function generateEmailsController(req, res) {
  const startTime = Date.now();
  const isPreviewMode = req.isPreviewMode || false;
  try {
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
    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }
    const normalizedDomain = normalizeDomain(domain);

    const existing = await getStoredBrand(normalizedDomain);
    
    let brandJson;
    if (!existing?.brand) {
      
      // For preview mode, create a fallback brand to allow generation
      if (isPreviewMode) {
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
      } else {
        return res.status(404).json({ error: "Brand info not found for domain", domain: normalizedDomain });
      }
    } else {
      // Use existing brand data (now in original brand.dev format)
      brandJson = structuredClone(existing.brand);
      
      // Add decisions to the original brand.dev payload
      brandJson.emailType = emailType || "";
      brandJson.userContext = userContext || "";
      brandJson.imageContext = imageContext || "";
      brandJson.tone = tone || "";
      brandJson.designAesthetic = designAesthetic || "";
      brandJson.customHeroImage = customHeroImage ?? true;
      
      // Add products to the payload
      brandJson.products = products || [];
      
      // Add saved hero image if provided
      if (typeof savedHeroImageUrl === "string" && /^https?:\/\//i.test(savedHeroImageUrl.trim())) {
        brandJson.savedHeroImageUrl = savedHeroImageUrl.trim();
      }
      
      // Add compatibility fields for generator services
      const brand = brandJson.brand || {};
      brandJson.store_name = brand.title || brand.domain || normalizedDomain;
      brandJson.store_url = `https://${brand.domain || normalizedDomain}`;
      brandJson.logo_url = brand.logos?.[0]?.url || null;
      brandJson.primary_color = brand.colors?.[0]?.hex || "#4f46e5";
      brandJson.link_color = brand.colors?.[1]?.hex || "#22d3ee";
    }
    // Log products for debugging

    // Add theme and styles for generator compatibility
    brandJson.theme = { 
      primaryColor: brandJson.primary_color, 
      linkColor: brandJson.link_color 
    };
    brandJson.styles = { 
      primary_color: brandJson.primary_color, 
      link_color: brandJson.link_color 
    };
    brandJson.debug = { 
      designAesthetic: brandJson.designAesthetic, 
      emailType: brandJson.emailType 
    };

    // Prepare payload to send to generator
    const payloadToSend = {
      brandData: brandJson,
      emailType: brandJson.emailType,
      userContext: brandJson.userContext,
      imageContext: brandJson.imageContext,
      designAesthetic: brandJson.designAesthetic,
      styleId: brandJson.designAesthetic,
      savedHeroImageUrl: brandJson.savedHeroImageUrl,
      customHeroImage: brandJson.customHeroImage,
      useCustomHeroImage: brandJson.customHeroImage
    };

    
    if (!process.env.GENERATOR_URL) {
      console.error("[generateController] GENERATOR_URL not configured");
      return res.status(500).json({ error: "Generator service not configured" });
    }
    
    const genStart = Date.now();
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payloadToSend),
    });

    if (!generatorResponse.ok) {
      const errorText = await generatorResponse.text().catch(() => "Unknown error");
      console.error("[generateController] Generator error:", errorText);
      
      // Try to parse error as JSON, but handle non-JSON responses gracefully
      let errorMessage = "Email generator service error";
      let errorType = "generator_error";
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
        errorType = errorJson.type || errorType;
      } catch (parseError) {
        // If it's not JSON, use the raw text (truncated)
        errorMessage = errorText.slice(0, 200) || errorMessage;
      }
      
      // Handle specific error types
      if (generatorResponse.status === 429) {
        return res.status(429).json({ 
          error: "Too many requests. Please wait a moment before trying again.",
          type: "rate_limit",
          retryAfter: generatorResponse.headers.get("retry-after") || 60
        });
      }
      
      if (generatorResponse.status >= 500) {
        return res.status(500).json({ 
          error: errorMessage,
          type: errorType,
          originalStatus: generatorResponse.status
        });
      }
      return res.status(500).json({ 
        error: errorMessage, 
        status: generatorResponse.status,
        type: errorType
      });
    }
    console.log("🎯 [CONTROLLER] Generator response OK, parsing response...");
    const headerHero = generatorResponse.headers.get("x-hero-image-url-used") || null;
    let generated;
    
    // First try to get the response as text to check if it's MJML
    const responseText = await generatorResponse.text();
    
    // Try to parse as JSON first (new format with subject line)
    try {
      generated = JSON.parse(responseText);
      console.log("🎯 [CONTROLLER] Generator JSON parsed successfully");
    } catch (parseError) {
      // Fallback: Check if the response looks like MJML (starts with <mjml>)
      if (responseText.trim().startsWith('<mjml>')) {
        console.log("🎯 [CONTROLLER] Detected MJML response, processing directly");
        
        // Create a mock structure that matches the expected format
        generated = {
          emails: [{
            content: responseText,
            subject: brandJson.subject || "Generated Email",
            preview: brandJson.preview || ""
          }]
        };
      } else {
        console.error("[generateController] Failed to parse generator response as JSON:", parseError);
        return res.status(500).json({ error: "Invalid response from generator service" });
      }
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

      // CRITICAL: Only upload to Supabase if useCustomHeroImage is true (newly generated images only)
      // No other images (logos, banners, products, etc.) should ever be uploaded to Supabase
      const useCustomHeroImage = brandJson.customHeroImage ?? brandJson.useCustomHeroImage ?? true;
      
      if (!useCustomHeroImage) {
        console.log(`[generateController] Skipping image upload - useCustomHeroImage is false`);
      }
      
      // Only proceed if we have a user + domain + a URL to store AND not in preview mode AND useCustomHeroImage is true
      if (uid && normalizedDomain && urlToStore && !isPreviewMode && useCustomHeroImage) {
        // If user picked a saved image and it's the same link, just reuse existing DB row
        if (selectedUrl && selectedUrl === urlToStore) {
          const { data: existing } = await supabase
            .from("user_images")
            .select("id, public_url, path, created_at, width, height")
            .eq("user_id", uid)
            .eq("domain", normalizedDomain)
            .eq("public_url", extractedUrl) // use original (non-normalized) match first
            .maybeSingle();

          if (existing) savedHero = existing;
          else {
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
          if (existing) savedHero = existing;
          else {
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
        // Still not found? Only then upload/save.
        if (!savedHero) {
          if (extractedUrl.startsWith("data:")) {
            savedHero = await storeUserImageFromDataUrl({
              userId: uid,
              domain: normalizedDomain,
              dataUrl: extractedUrl,
            });
          } else if (/^https?:\/\//i.test(extractedUrl)) {
            // Skip re-saving images that are already from Supabase (generated images)
            if (extractedUrl.includes('supabase.co') || extractedUrl.includes('supabase.com')) {
              console.log(`[generateController] Skipping re-save of Supabase image: ${extractedUrl}`);
              // Just create a database record without re-uploading
              const { data, error } = await supabase
                .from("user_images")
                .insert({ 
                  user_id: uid, 
                  domain: normalizedDomain, 
                  path: extractedUrl, // Use the URL as path for Supabase images
                  public_url: extractedUrl 
                })
                .select()
                .single();
              
              if (!error) savedHero = data;
            } else {
              savedHero = await storeUserImageFromUrl({
                userId: uid,
                domain: normalizedDomain,
                url: extractedUrl,
              });
            }
          }
        } else {
        }
      }
    } catch (e) {
      console.warn("[generateController] Hero image save skipped:", e?.message || e);
    }
    // Generate subject line based on user context
    let finalSubjectLine = "";
    try {
      const userContext = brandJson.userContext || "";
      const brandName = brandJson.brand?.title || brandJson.name || normalizedDomain;
      const emailType = brandJson.emailType || "Promotion";
      const tone = brandJson.tone || "bold";
      
      if (isPreviewMode) {
        finalSubjectLine = generatePreviewSubjectLine(userContext, brandName, emailType);
      } else {
        finalSubjectLine = await generateSubjectLine(userContext, brandName, emailType, tone);
      }
      
      console.log("📧 [CONTROLLER] Generated subject line:", finalSubjectLine);
    } catch (error) {
      console.error("📧 [CONTROLLER] Error generating subject line:", error);
      finalSubjectLine = generated.subjectLine || generated.subject || (htmlEmails[0]?.subject ?? "");
    }

    // ================================================================
    const response = {
      success: true,
      subjectLine: finalSubjectLine,
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
    return res.status(500).json({ error: "Failed to generate emails", details: err.message });
  }
}
