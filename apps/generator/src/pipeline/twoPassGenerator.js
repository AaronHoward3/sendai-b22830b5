// src/pipeline/twoPassGenerator.js
// Two-pass: (1) layout + LLM refine (content only), (2) deterministic theming.

import OpenAI from "openai";
import ora from "ora";

import { chooseLayout, composeBaseMjml } from "../layout/layoutComposer.js";
import { retryOpenAI } from "../utils/retryUtils.js";
import { renderProductSection } from "../services/productSectionService.js";
import { injectBrandLinks } from "../utils/injectBrandLinks.js";
import { newMetrics } from "../utils/metrics.js";
import { countTokens } from "../utils/tokenizer.js";
import { formatMjml } from "../utils/formatMjml.js";

import { applyTheme } from "../theme/applyTheme.js";
import { resolveSkinId, makeSkin } from "../theme/skins.js";
import { buildBrandTokens } from "../theme/tokens.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Process user context to extract key concepts for concise email content
 */
function processUserContext(userContext, brandData, emailType) {
  if (!userContext || typeof userContext !== 'string') {
    return emailType?.toLowerCase() === "newsletter" ? "General newsletter content" : "General promotion";
  }
  
  const context = userContext.toLowerCase().trim();
  const brandName = (brandData?.name || brandData?.brandData?.name || "").toLowerCase();
  
  // For newsletters, preserve more context for richer content
  if (emailType?.toLowerCase() === "newsletter") {
    // Extract key concepts but keep more detail
    const concepts = [];
    
    // Content type indicators
    if (/story|journey|behind|process|how|why|experience|insight|lesson/i.test(context)) {
      concepts.push("storytelling");
    }
    
    if (/update|news|announcement|launch|release|feature/i.test(context)) {
      concepts.push("company updates");
    }
    
    if (/tip|advice|guide|tutorial|how-to|educational/i.test(context)) {
      concepts.push("educational content");
    }
    
    if (/behind|process|making|creation|development/i.test(context)) {
      concepts.push("behind-the-scenes");
    }
    
    // Brand personality
    if (/luxury|premium|exclusive|elite|high-end/i.test(brandName + " " + context)) {
      concepts.push("luxury brand");
    }
    
    if (/tech|digital|app|software|innovation/i.test(brandName + " " + context)) {
      concepts.push("tech company");
    }
    
    if (/fashion|style|trend|design|aesthetic/i.test(brandName + " " + context)) {
      concepts.push("fashion brand");
    }
    
    // Fallback with more context
    if (concepts.length === 0) {
      // For newsletters, provide a bit more context
      const shortContext = context.length > 100 ? context.substring(0, 100) + "..." : context;
      return `Newsletter content: ${shortContext}`;
    }
    
    return concepts.join(", ");
  }
  
  // For promotions, use the existing concise processing
  const concepts = [];
  
  // Urgency indicators
  if (/urgent|limited|expires|deadline|flash|quick|now|today|tomorrow|hurry/i.test(context)) {
    concepts.push("urgent");
  }
  
  // Sale/discount indicators
  if (/sale|discount|off|save|deal|special|promo|clearance/i.test(context)) {
    concepts.push("sale");
  }
  
  // Product categories
  if (/new|launch|arrival|collection|seasonal/i.test(context)) {
    concepts.push("new products");
  }
  
  // Brand personality
  if (/luxury|premium|exclusive|elite|high-end/i.test(brandName + " " + context)) {
    concepts.push("luxury");
  }
  
  if (/tech|digital|app|software|innovation/i.test(brandName + " " + context)) {
    concepts.push("tech");
  }
  
  if (/fashion|style|trend|design|aesthetic/i.test(brandName + " " + context)) {
    concepts.push("fashion");
  }
  
  // Content type
  if (/story|journey|behind|process|how|why|experience/i.test(context)) {
    concepts.push("storytelling");
  }
  
  if (/testimonial|review|customer|love|recommend|trust/i.test(context)) {
    concepts.push("social proof");
  }
  
  // Fallback
  if (concepts.length === 0) {
    concepts.push("general promotion");
  }
  
  return concepts.join(", ");
}

/**
 * Get content guidelines based on email type
 */
function getContentGuidelines(emailType) {
  const emailTypeLower = (emailType || "").toLowerCase();
  
  if (emailTypeLower === "newsletter") {
    return `CONTENT GUIDELINES FOR NEWSLETTER:
- Write ENGAGING, DESCRIPTIVE headlines (5-12 words)
- Use DETAILED, INFORMATIVE subheadings (10-25 words)
- Create ELABORATE paragraphs with rich storytelling
- Focus on VALUE, INSIGHTS, and EDUCATIONAL content
- Use CONVERSATIONAL, PERSONAL tone
- Include DETAILED explanations and context
- Write COMPREHENSIVE content that informs and engages
- Use STORYTELLING techniques to build connection
- Include BACKGROUND information and behind-the-scenes content`;
  } else {
    return `CONTENT GUIDELINES FOR PROMOTION:
- Write CONCISE, IMPACTFUL headlines (3-8 words max)
- Use SHORT, CLEAR subheadings (5-15 words max)
- Focus on BENEFITS, not features
- Use ACTION-ORIENTED language
- Avoid lengthy explanations in headers
- Create SCANNABLE, QUICK-READ content
- Use URGENT, COMPELLING language
- Focus on CONVERSION and SALES`;
  }
}

function buildRefinerPrompt({ baseMjml, emailType, designAesthetic, brandData, userContext }) {
  // Process user context to extract key concepts instead of using verbatim
  const processedContext = processUserContext(userContext, brandData, emailType);
  
  // Different content guidelines based on email type
  const contentGuidelines = getContentGuidelines(emailType);
  
  return String.raw`You are an expert email designer and copywriter.

TASK:
- You are given a complete MJML skeleton built from fixed template blocks.
- Your job is to only refine content: replace text copy, set hrefs, set image src values.
- REPLACE ALL PLACEHOLDERS: Any text in {{placeholder}} format must be replaced with appropriate content.
- Do not change structure or add/remove blocks.
- Do NOT attempt to change colors or add new styles. Styling is handled later.

STRICT RULES:
- Keep all MJML tags and block structure as-is.
- Do NOT modify header or footer sections (marked with <!-- Blockfile: header-block --> and <!-- Blockfile: footer-block -->).
- Do NOT remove <!-- Blockfile: ... --> markers inside <mj-raw>.
- Preserve https://CUSTOMHEROIMAGE.COM if present.
- All <mj-image> must be open+close tags; no self-closing.
- No font-family on MJML tags. Keep valid MJML.

PLACEHOLDER REPLACEMENT RULES:
- {{hero_title}}: Replace with compelling headline (3-8 words for promotions, 5-12 words for newsletters)
- {{hero_subtitle}}: Replace with descriptive subheading (5-15 words for promotions, 10-25 words for newsletters)
- {{cta_url}}: Replace with appropriate brand URL (homepage, products, or specific collection)
- {{cta_button_label}}: Replace with action-oriented button text (Shop Now, Learn More, View Collection, etc.)
- {{social_proof_title}}: Replace with testimonial headline (e.g., "What Our Customers Say", "Join Thousands of Happy Customers")
- {{testimonial_text}}: Replace with realistic customer testimonial or social proof
- {{customer_name}}: Replace with realistic customer name
- {{story_title}}: Replace with engaging story headline
- {{story_content}}: Replace with detailed story content (for newsletters)
- {{story_conclusion}}: Replace with story conclusion (for newsletters)
- {{P1_TITLE}}, {{P1_SUBTITLE}}, {{P1_IMAGE_URL}}: Replace with actual product data from brandData.products

${contentGuidelines}

INPUTS:
Email Type: ${emailType}
Design Aesthetic: ${designAesthetic || "minimal_clean"}
Content Focus: ${processedContext}
Brand Data JSON:
${JSON.stringify(brandData || {}, null, 2)}

BASE MJML (Refine this only; keep structure the same):
\`\`\`mjml
${baseMjml}
\`\`\`
`;
}

async function buildProductSectionWithFallbacks({ emailType, products, designAesthetic, seed, analysis = {} }) {
  if (!Array.isArray(products) || products.length === 0) {
    console.log("🔍 [DEBUG] No products provided for product section");
    return "";
  }

  const attempts = [ designAesthetic, "skeleton", "minimal_clean", "bold_contrasting" ].filter(Boolean);

  for (const aesthetic of attempts) {
    try {
      console.log(`🔍 [DEBUG] Attempting product section with aesthetic: ${aesthetic}`);
      const html = await renderProductSection( emailType, aesthetic, products, seed, null, analysis );
      if (html && typeof html === "string" && html.trim().length > 0) {
        console.log(`🔍 [DEBUG] Successfully generated product section with aesthetic: ${aesthetic}`);
        return html;
      } else {
        console.log(`🔍 [DEBUG] Empty product section returned for aesthetic: ${aesthetic}`);
      }
    } catch (error) {
      console.log(`🔍 [DEBUG] Error generating product section with aesthetic ${aesthetic}:`, error.message);
    }
  }
  console.log("🔍 [DEBUG] All product section generation attempts failed");
  return "";
}

function injectProductSectionIntoMjml(baseMjml, productHtml) {
  if (!productHtml) {
    console.log("🔍 [DEBUG] No product HTML to inject");
    return baseMjml;
  }

  console.log(`🔍 [DEBUG] Injecting product section, HTML length: ${productHtml.length}`);

  const tokenRe = /\[\[\s*PRODUCT_SECTION\s*\]\]/i;
  if (tokenRe.test(baseMjml)) {
    console.log("🔍 [DEBUG] Found PRODUCT_SECTION token, replacing");
    return baseMjml.replace(tokenRe, productHtml);
  }

  const closeSectionRe = /<\/mj-section>/i;
  const match = baseMjml.match(closeSectionRe);
  if (match && match.index != null) {
    console.log("🔍 [DEBUG] Inserting after first mj-section");
    const insertAt = match.index + match[0].length;
    return baseMjml.slice(0, insertAt) + "\n" + productHtml + "\n" + baseMjml.slice(insertAt);
  }

  if (baseMjml.includes("</mj-body>")) {
    console.log("🔍 [DEBUG] Inserting before mj-body closing tag");
    return baseMjml.replace("</mj-body>", `${productHtml}\n</mj-body>`);
  }

  console.log("🔍 [DEBUG] Appending to end of MJML");
  return baseMjml + "\n" + productHtml;
}

export async function runTwoPassGeneration({
  emailType,
  designAesthetic = "minimal_clean",
  brandData,
  userContext,
  wantsMjml,
  onStatus = () => {},
  metrics,
  styleId
}) {
  const m = metrics ?? newMetrics({ emailType, designAesthetic });
  m.log("Generation started.", { emailType, designAesthetic });

  // 1) Layout selection & base MJML
  m.start("layout");
  const layout = await chooseLayout(emailType, designAesthetic, brandData, userContext);
  let baseMjml = await composeBaseMjml(emailType, designAesthetic, layout, brandData);
  m.end("layout");

  onStatus("layout:chosen", { layoutId: layout.layoutId });
  m.log("Layout chosen:", layout.layoutId);

  // 1.1) Product section
  console.log("🔍 [DEBUG] Product processing:", {
    emailType,
    isPromotion: emailType === "Promotion",
    hasProducts: Array.isArray(brandData?.products),
    productsLength: brandData?.products?.length || 0,
    productsPreview: brandData?.products?.slice(0, 2) || []
  });
  
  if ((emailType === "Promotion") && Array.isArray(brandData?.products)) {
    m.start("productSection");
    const productHtml = await buildProductSectionWithFallbacks({
      emailType, products: brandData.products, designAesthetic, seed: layout.layoutId, analysis: layout.analysis
    });
    console.log("🔍 [DEBUG] Product HTML generated:", {
      hasProductHtml: !!productHtml,
      productHtmlLength: productHtml?.length || 0,
      productHtmlPreview: productHtml?.substring(0, 200) || 'EMPTY'
    });
    baseMjml = injectProductSectionIntoMjml(baseMjml, productHtml);
    m.end("productSection");
  } else {
    console.log("🔍 [DEBUG] Removing PRODUCT_SECTION token");
    baseMjml = baseMjml.replace(/\[\[\s*PRODUCT_SECTION\s*\]\]/gi, "");
  }

  // 1.2) Make hero clickable
  const brandUrl = brandData?.website || brandData?.brandUrl || brandData?.url || brandData?.homepage || "";
  baseMjml = injectBrandLinks(baseMjml, brandUrl);

  if (process.env.EG_DEBUG === "1") {
    console.log("\n=== BASE MJML (pre-refine) ===\n", baseMjml.slice(0, 1500), "\n=== /BASE ===\n");
  }

  // 2) Refine via model – copy only
  const spinner = ora("Refining MJML...").start();
  try {
    onStatus("assistant:refine:start", { model: process.env.REFINE_MODEL || "gpt-3.5-turbo" });
    m.start("emailRefine");

    const sys = wantsMjml
      ? "You return ONLY MJML content wrapped in ```mjml fences. No commentary."
      : "You will primarily output MJML. Keep structure intact.";
    const prompt = buildRefinerPrompt({ baseMjml, emailType, designAesthetic, brandData, userContext });

    try {
      const pt = await countTokens(`${sys}\n\n${prompt}`); m.addLocalUsage?.({ input: pt });
    } catch {}

    const resp = await retryOpenAI(async () =>
      openai.chat.completions.create({
        model: process.env.REFINE_MODEL || "gpt-3.5-turbo",
        temperature: 0.3,
        messages: [{ role: "system", content: sys }, { role: "user", content: prompt }]
      })
    );

    m.addUsageFromResponse?.(resp);
    m.recordApiCall?.({ step: "refine", model: resp.model || process.env.REFINE_MODEL || "gpt-3.5-turbo", usage: resp.usage });

    const raw = resp.choices?.[0]?.message?.content || "";
    const refinedMjml = raw.replace(/^\s*```mjml/i, "").replace(/```[\s\n\r]*$/g, "").trim();

    try { const ot = await countTokens(refinedMjml); m.addLocalUsage?.({ output: ot }); } catch {}

    m.end("emailRefine");
    spinner.succeed("Refinement complete");
    onStatus("assistant:refine:done", { ok: true });

    // 3) Deterministic theming (NO LLM)
    const skinId = resolveSkinId(styleId || designAesthetic || "minimal_clean");
    // Compute the actual skin pack so we can return it for logging/metrics
    const tokens = buildBrandTokens(brandData);
    const skin = makeSkin(tokens, skinId, brandData._styleManifest);

    const themedMjml = applyTheme(refinedMjml, brandData, skinId);

    // 4) Pretty format
    const prettyMjml = await formatMjml(themedMjml, {
      normalizeDataUris: true,
      stripTrackingParams: false
    });

    // Return the full skin pack (has .palette) instead of just the ID
    return { layout, refinedMjml: prettyMjml, styleUsed: skin, metrics: m };
  } catch (err) {
    spinner.stop();
    throw err;
  }
}

export default runTwoPassGeneration;
