// src/controllers/emailController.js
// Explicit style selection only. No styleSeed. Back-compat with designAesthetic.

import { TIMEOUTS } from "../config/constants.js";
import { generateCustomHeroAndEnrich } from "../services/heroImageService.js";
import { processFooterTemplate } from "../services/footerService.js";
import { processHeaderTemplate } from "../services/headerService.js";
import { generateSubjectLine } from "../services/subjectService.js";
import { saveMJML, updateMJML, getMJML, deleteMJML } from "../utils/inMemoryStore.js";
import { runTwoPassGeneration } from "../pipeline/twoPassGenerator.js";
import { newMetrics, setLastMetrics } from "../utils/metrics.js";
import { computeTextCostUSD } from "../utils/pricing.js";

function isSse(req) {
  return (req.headers.accept || "").includes("text/event-stream") || String(req.query.stream) === "1";
}
function sseInit(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}
function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data || {})}\n\n`);
}
function sseClose(res) {
  try { res.write("event: end\ndata: {}\n\n"); } catch {}
  try { res.end(); } catch {}
}

const normalizeStyleId = (v) =>
  String(v || "minimal_clean").trim().toLowerCase().replace(/\s+/g, "_");

export async function generateEmails(req, res) {
  const requestStartTime = performance.now();
  const streaming = isSse(req);
  if (streaming) sseInit(res);

  let hb;
  if (streaming) {
    hb = setInterval(() => { try { res.write(":hb\n\n"); } catch {} }, 15000);
    req.on("close", () => clearInterval(hb));
  }
  const send = streaming ? (e, d) => sseSend(res, e, d) : () => {};

  try {
    send("start", { at: Date.now() });

    if (!req.body) {
      const err = { error: "Request body is missing. Ensure Content-Type: application/json." };
      if (streaming) { sseSend(res, "error", err); if (hb) clearInterval(hb); sseClose(res); return; }
      return res.status(400).json(err);
    }

    let {
      brandData,
      emailType,
      userContext,
      imageContext,
      storeId,
      designAesthetic,
      styleId,

      // NEW: optional saved image injection
      savedHeroImageUrl, // string http(s) URL of a previously saved brand image
    } = req.body;

    if (!brandData || !emailType) {
      const err = { error: "Missing brandData or emailType in request body." };
      if (streaming) { sseSend(res, "error", err); if (hb) clearInterval(hb); sseClose(res); return; }
      return res.status(400).json(err);
    }

    const resolvedStyleId = normalizeStyleId(styleId || designAesthetic || "minimal_clean");

    const wantsMjml =
      (req.headers.accept || "").includes("text/mjml") ||
      (req.headers.accept || "").includes("application/mjml");

    // METRICS
    const m = newMetrics({ emailType, designAesthetic: resolvedStyleId });
    m.log("Request received.", {
      emailType,
      designAesthetic: resolvedStyleId,
      hasProducts: Array.isArray(brandData?.products) ? brandData.products.length : 0,
      wantsCustomHero: brandData?.customHeroImage === true
    });

    // Optional: color hints from userContext (ignored for brand colors per policy)
    if (userContext && typeof userContext === "string") {
      /* no-op: do not override brandData.colors from user text */
    }
    if (imageContext) brandData.imageContext = imageContext.trim().slice(0, 300);

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

    // Debug the incoming request body structure
    console.log(`🔍 [DEBUG] Generator ${jobId} received request body:`);
    console.log("🔍 [DEBUG] hasBrandData:", !!req.body?.brandData);
    console.log("🔍 [DEBUG] brandDataKeys:", req.body?.brandData ? Object.keys(req.body.brandData) : []);
    console.log("🔍 [DEBUG] hasStoreName:", !!req.body?.brandData?.store_name);
    console.log("🔍 [DEBUG] hasStoreUrl:", !!req.body?.brandData?.store_url);
    console.log("🔍 [DEBUG] hasLogoUrl:", !!req.body?.brandData?.logo_url);
    console.log("🔍 [DEBUG] hasProducts:", !!req.body?.brandData?.products);
    console.log("🔍 [DEBUG] productsLength:", req.body?.brandData?.products?.length || 0);
    console.log("🔍 [DEBUG] storeName:", req.body?.brandData?.store_name);
    console.log("🔍 [DEBUG] storeUrl:", req.body?.brandData?.store_url);
    console.log("🔍 [DEBUG] logoUrl:", req.body?.brandData?.logo_url);
    console.log("🔍 [DEBUG] products preview:", req.body?.brandData?.products?.slice(0, 2));

    // Determine which hero mode we're in:
    // 1) Generate a brand-new custom image (existing path)
    // 2) Inject a previously saved image URL (new path)
    const wantsSavedHero =
      typeof savedHeroImageUrl === "string" &&
      /^https?:\/\//i.test(savedHeroImageUrl.trim());

    // If a saved image is supplied, it wins (we do NOT generate a new image)
    const wantsCustomHero = !wantsSavedHero && brandData.customHeroImage === true;

    // Prepare placeholders so downstream templates point at a stable token
    if (wantsCustomHero) {
      brandData.primary_custom_hero_image_banner = "https://CUSTOMHEROIMAGE.COM";
      brandData.hero_image_url = "https://CUSTOMHEROIMAGE.COM";
    }

    // NEW: saved image placeholder
    if (wantsSavedHero) {
      // Ensure we don't accidentally kick off generation
      brandData.customHeroImage = false;
      brandData.hero_image_url = "https://SAVEDHEROIMAGE.COM";
    }

    // Fallback header image
    brandData.header_image_url =
      brandData.banner_url && brandData.banner_url.trim() !== ""
        ? brandData.banner_url
        : brandData.logo_url || "";

    // Generate hero and email content in parallel for faster processing
    if (wantsCustomHero) send("hero:start", {});
    send("refine:start", {});
    
    const heroPromise = wantsCustomHero
      ? Promise.race([
          generateCustomHeroAndEnrich(brandData, storeId, jobId, { metrics: m }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Hero generation timeout")), TIMEOUTS.HERO_GENERATION)
          )
        ]).catch(err => {
          m.log("Hero generation failed:", err.message);
          return brandData;
        })
      : Promise.resolve(brandData);

    const emailPromise = runTwoPassGeneration({
      emailType,
      designAesthetic: resolvedStyleId,
      styleId: resolvedStyleId,
      brandData,
      userContext,
      wantsMjml,
      onStatus: (event, payload) => {
        if (event === "layout:chosen") send("layout:chosen", payload);
        if (event === "assistant:refine:start") send("refine:writing", payload);
        if (event === "assistant:refine:done") send("refine:done", payload);
        m.log(`status:${event}`, payload || {});
      },
      metrics: m
    });

    // Wait for both to complete
    const [finalBrandData, { layout, refinedMjml, styleUsed }] = await Promise.all([
      heroPromise,
      emailPromise
    ]);

    console.log("STYLE PALETTE USED:", styleUsed?.palette);

    saveMJML(jobId, 0, refinedMjml);

    // Hero replacement / header and footer stitching
    send("finalizing", {});
    const stored = getMJML(jobId) || [];
    
    console.log("🔍 [DEBUG] finalBrandData structure:", {
      hasStoreName: !!finalBrandData.store_name,
      hasStoreUrl: !!finalBrandData.store_url,
      hasProducts: !!finalBrandData.products,
      productsLength: finalBrandData.products?.length || 0
    });
    
    const headerMjml = await processHeaderTemplate(finalBrandData);
    const footerMjml = await processFooterTemplate(finalBrandData);
    
    console.log("🔍 [DEBUG] Header/Footer processing:", {
      headerLength: headerMjml?.length || 0,
      footerLength: footerMjml?.length || 0,
      headerPreview: headerMjml?.substring(0, 100) || 'EMPTY',
      footerPreview: footerMjml?.substring(0, 100) || 'EMPTY'
    });

    const fontHead = `
      <mj-head>
        <mj-attributes>
          <mj-text font-family="Helvetica Neue, Helvetica, Arial, sans-serif"></mj-text>
          <mj-button font-family="Helvetica Neue, Helvetica, Arial, sans-serif"></mj-button>
        </mj-attributes>
      </mj-head>
    `;

    let heroImageUrlUsed = null; // NEW: expose the actual url used back to caller

    (stored || []).forEach((mjmlStr, index) => {
      if (!mjmlStr) return;
      let updated = mjmlStr;

      // EXISTING: replace placeholder with newly generated custom hero
      console.log("🔍 [DEBUG] Hero image replacement check:", {
        customHeroImage: finalBrandData.customHeroImage,
        hasHeroImageUrl: !!finalBrandData.hero_image_url,
        heroImageUrl: finalBrandData.hero_image_url,
        containsHttp: finalBrandData.hero_image_url?.includes("http"),
        containsPlaceholder: finalBrandData.hero_image_url?.includes("CUSTOMHEROIMAGE"),
        mjmlContainsPlaceholder: updated.includes("CUSTOMHEROIMAGE.COM")
      });
      
      if (
        finalBrandData.customHeroImage === true &&
        finalBrandData.hero_image_url &&
        finalBrandData.hero_image_url.includes("http") &&
        !finalBrandData.hero_image_url.includes("CUSTOMHEROIMAGE")
      ) {
        console.log("🔍 [DEBUG] Replacing CUSTOMHEROIMAGE with:", finalBrandData.hero_image_url);
        // More flexible regex to handle additional attributes after src
        updated = updated.replace(/src="https:\/\/CUSTOMHEROIMAGE\.COM"/g, `src="${finalBrandData.hero_image_url}"`);
        updated = updated.replace(/background-url="https:\/\/CUSTOMHEROIMAGE\.COM"/g, `background-url="${finalBrandData.hero_image_url}"`);
        heroImageUrlUsed = finalBrandData.hero_image_url; // NEW
        console.log("🔍 [DEBUG] After replacement, contains placeholder:", updated.includes("CUSTOMHEROIMAGE.COM"));
      }

      // NEW: replace placeholder with a previously SAVED image url
      if (wantsSavedHero) {
        updated = updated.replace(/src="https:\/\/SAVEDHEROIMAGE\.COM"/g, `src="${savedHeroImageUrl}"`);
        updated = updated.replace(/background-url="https:\/\/SAVEDHEROIMAGE\.COM"/g, `background-url="${savedHeroImageUrl}"`);
        heroImageUrlUsed = savedHeroImageUrl;
      }

      // Fallback: Always try to replace CUSTOMHEROIMAGE if it exists and we have a hero URL
      if (updated.includes("CUSTOMHEROIMAGE.COM") && finalBrandData.hero_image_url && finalBrandData.hero_image_url.includes("http")) {
        console.log("🔍 [DEBUG] Fallback replacement - replacing CUSTOMHEROIMAGE with:", finalBrandData.hero_image_url);
        updated = updated.replace(/src="https:\/\/CUSTOMHEROIMAGE\.COM"/g, `src="${finalBrandData.hero_image_url}"`);
        updated = updated.replace(/background-url="https:\/\/CUSTOMHEROIMAGE\.COM"/g, `background-url="${finalBrandData.hero_image_url}"`);
        heroImageUrlUsed = finalBrandData.hero_image_url;
      }

      if (!updated.includes("<mj-head>")) {
        updated = updated.replace("<mjml>", `<mjml>${fontHead}`);
      }

      // Remove any previous header and inject the new one at the beginning of mj-body
      updated = updated.replace(/<!-- Header Section -->[\s\S]*?<!-- \/Header Section -->/g, "");
      if (headerMjml && updated.includes("<mj-body>")) {
        console.log("🔍 [DEBUG] Injecting header into MJML");
        updated = updated.replace("<mj-body>", `<mj-body>\n${headerMjml}`);
      } else {
        console.log("🔍 [DEBUG] Header injection skipped:", {
          hasHeaderMjml: !!headerMjml,
          hasMjBody: updated.includes("<mj-body>")
        });
      }

      // Remove any previous footer and append the new one
      updated = updated.replace(/<!-- Footer Section -->[\s\S]*?<\/mj-body>/g, "</mj-body>");
      if (footerMjml && updated.includes("</mj-body>") && !updated.includes("mj-social")) {
        console.log("🔍 [DEBUG] Injecting footer into MJML");
        updated = updated.replace("</mj-body>", `${footerMjml}\n</mj-body>`);
      } else if (footerMjml && updated.includes("<mj-body") && !updated.includes("mj-social")) {
        console.log("🔍 [DEBUG] Injecting footer into MJML (alternative)");
        updated = `${updated}\n${footerMjml}\n</mj-body>`;
      } else {
        console.log("🔍 [DEBUG] Footer injection skipped:", {
          hasFooterMjml: !!footerMjml,
          hasMjBodyClose: updated.includes("</mj-body>"),
          hasMjSocial: updated.includes("mj-social")
        });
      }

      updateMJML(jobId, index, updated);
    });

    const mjmlOut = (getMJML(jobId) || [])[0] || refinedMjml;

    // Let the client know which image ended up being used
    if (streaming && heroImageUrlUsed) {
      sseSend(res, "hero:used", { url: heroImageUrlUsed, source: wantsSavedHero ? "saved" : "generated" });
    }

    const subjectLine = await generateSubjectLine({
      brandData: finalBrandData,
      emailType,
      designAesthetic: resolvedStyleId,
      userContext,
      refinedMjml: mjmlOut,
      metrics: m
    });

    // Costs/metrics
    const textCosts = computeTextCostUSD(m.apiCalls || []);
    const imageCosts = m.costs?.image;
    const totalUSD = (textCosts?.totalUSD || 0) + (imageCosts?.imageTotalCostUSD || 0);

    const summary = m.summary({ layout: layout?.layoutId || null });
    summary.costsUSD = {
      text: textCosts,
      image: imageCosts,
      totalUSD: Math.round((totalUSD + Number.EPSILON) * 1e5) / 1e5
    };

    setLastMetrics(summary);
    setTimeout(() => deleteMJML(jobId), 1000);

    if (streaming) {
      sseSend(res, "metrics", summary);
      sseSend(res, "result", { subjectLine, mjml: mjmlOut, styleUsed, heroImageUrlUsed }); // NEW
      sseSend(res, "done", {});
      if (hb) clearInterval(hb);
      sseClose(res);
      return;
    }

    res.setHeader("X-Style-Used", styleUsed?.id || resolvedStyleId);

    if (wantsMjml && mjmlOut) {
      res.setHeader("Content-Type", "text/mjml");
      res.setHeader("X-Subject-Line", subjectLine);
      if (heroImageUrlUsed) res.setHeader("X-Hero-Image-Url-Used", heroImageUrlUsed); // NEW
      return res.send(mjmlOut);
    }

    return res.json({
      success: true,
      subjectLine,
      emails: [{ index: 1, content: mjmlOut }],
      styleUsed,
      layoutId: summary.layout,
      timesMs: summary.timesMs,
      totalMs: summary.totalMs,
      usage: summary.usage,
      costsUSD: summary.costsUSD,
      requestId: summary.requestId,
      heroImageUrlUsed, // NEW: so API can persist it for the brand card
    });
  } catch (error) {
    if (streaming) {
      sseSend(res, "error", { error: error.message });
      if (hb) clearInterval(hb);
      return sseClose(res);
    }
    console.error("Request processing failed:", error.message);
    return res.status(500).json({ error: error.message });
  } finally {
    const requestDuration = performance.now() - requestStartTime;
    console.log(
      `[${new Date().toISOString()}] Request completed: ${req.method} ${req.url} - ${res.statusCode} (${requestDuration.toFixed(0)}ms)`
    );
  }
}
