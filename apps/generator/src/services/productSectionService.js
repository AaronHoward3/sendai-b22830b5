// src/services/productSectionService.js
import fs from "fs";
import path from "path";

/**
 * Product Section Resolver
 * - Looks first in:   lib/<type>/skeleton/product-sections/<count>/*.txt
 * - Falls back to:    lib/<type>/<aesthetic>/product-sections/<count>/*.txt
 * - Picks the best count <= desired (or closest available)
 * - Fills placeholders: {{P{N}_TITLE}}, {{P{N}_SUBTITLE}}, {{P{N}_PRICE}},
 *   {{P{N}_IMAGE_URL}}, {{P{N}_BUTTON_TEXT}}, {{P{N}_BUTTON_URL}}
 */

// Map Email Type -> base folder name in your /lib structure
const TYPE_DIRS = {
  Promotion: "promotion-blocks",
  Newsletter: "newsletter-blocks", // in case you want product sections in newsletters
};

// Root is the repo's lib folder
const LIB_ROOT = path.resolve(process.cwd(), "lib");
const TXT_EXT = new Set([".txt", ".mjml"]);

function typeRoot(emailType) {
  const dir = TYPE_DIRS[emailType];
  if (!dir) return null;
  return path.join(LIB_ROOT, dir);
}

function skeletonRoot(emailType) {
  const base = typeRoot(emailType);
  if (!base) return null;
  return path.join(base, "skeleton", "product-sections");
}

function legacyAestheticRoot(emailType, aesthetic) {
  const base = typeRoot(emailType);
  if (!base) return null;
  if (!aesthetic) return null;
  return path.join(base, aesthetic, "product-sections");
}

function listCounts(rootDir) {
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => parseInt(e.name, 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function listVariantFiles(dirForCount) {
  try {
    const entries = fs.readdirSync(dirForCount, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && TXT_EXT.has(path.extname(e.name).toLowerCase()))
      .map((e) => path.join(dirForCount, e.name));
  } catch {
    return [];
  }
}

function chooseCount(availableCounts, want) {
  if (!availableCounts.length) return null;
  if (!want || want <= 0) return availableCounts[0];

  const underOrEqual = availableCounts.filter((c) => c <= want);
  if (underOrEqual.length) return underOrEqual[underOrEqual.length - 1]; // closest <= want

  // otherwise choose the smallest available (fallback)
  return availableCounts[0];
}

// Simple deterministic RNG by seed (mulberry32)
function seededRng(seed) {
  let h = 1779033703 ^ String(seed).split("").reduce((a, c) => (Math.imul(a ^ c.charCodeAt(0), 3432918353) | 0), 0);
  h = Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
  let t = (h ^ (h >>> 16)) >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function fillTemplate(tpl, prods) {
  let out = tpl;
  console.log(`🔍 [DEBUG] Filling template with ${prods.length} products`);
  
  prods.forEach((p, idx) => {
    const i = idx + 1;
    console.log(`🔍 [DEBUG] Product ${i}:`, { 
      title: p.title, 
      subtitle: p.subtitle, 
      price: p.price, 
      imageUrl: p.imageUrl, 
      buttonText: p.buttonText, 
      buttonUrl: p.buttonUrl || p.buttonURL || p.url 
    });
    
    out = out
      .replaceAll(`{{P${i}_TITLE}}`, p.title ?? "")
      .replaceAll(`{{P${i}_SUBTITLE}}`, p.subtitle ?? "")
      .replaceAll(`{{P${i}_PRICE}}`, p.price ?? "")
      .replaceAll(`{{P${i}_IMAGE_URL}}`, p.imageUrl ?? "")
      .replaceAll(`{{P${i}_BUTTON_TEXT}}`, p.buttonText ?? "View")
      .replaceAll(`{{P${i}_BUTTON_URL}}`, p.buttonUrl ?? p.buttonURL ?? p.url ?? "");
  });
  
  // Check for any remaining placeholders
  const remainingPlaceholders = out.match(/\{\{P\d+_[A-Z_]+\}\}/g);
  if (remainingPlaceholders) {
    console.log(`🔍 [DEBUG] Warning: Unfilled placeholders found:`, remainingPlaceholders);
  }
  
  return out;
}

/**
 * Smart product section selection based on content analysis
 */
function selectSmartProductLayout(availableLayouts, analysis, productCount) {
  if (!availableLayouts.length) return availableLayouts[0];
  
  // Define layout preferences based on analysis
  const preferences = {
    // For minimal/clean content: prefer stacked layouts
    minimal: ["stacked_centered", "Stack", "single"],
    
    // For bold content: prefer grid layouts
    bold: ["grid_2x2", "grid_4x1", "altgrid", "zigzag_rows"],
    
    // For urgent content: prefer compact layouts
    urgent: ["grid_4x1", "grid_2x2"],
    
    // For story content: prefer single/stacked layouts
    story: ["stacked_centered", "single", "Stack"],
    
    // For feature content: prefer grid layouts
    feature: ["grid_2x2", "altgrid", "zigzag_rows"],
    
    // For social content: prefer centered layouts
    social: ["stacked_centered", "single"]
  };
  
  // Find preferred layouts that exist
  const preferredLayouts = [];
  for (const [key, layouts] of Object.entries(preferences)) {
    if (analysis[key]) {
      preferredLayouts.push(...layouts);
    }
  }
  
  // Filter to only layouts that actually exist
  const availablePreferred = preferredLayouts.filter(layout => 
    availableLayouts.some(available => available.includes(layout))
  );
  
  // Return preferred layout if available, otherwise random
  if (availablePreferred.length > 0) {
    return availablePreferred[Math.floor(Math.random() * availablePreferred.length)];
  }
  
  return availableLayouts[Math.floor(Math.random() * availableLayouts.length)];
}

/**
 * Render a product section MJML fragment with smart layout selection.
 * @param {("Promotion"|"Newsletter")} emailType
 * @param {string} aesthetic  // kept for backward-compatibility; used only for fallback
 * @param {Array} products    // [{title, subtitle, price, imageUrl, buttonText, buttonUrl}]
 * @param {string|number} seed
 * @param {number|null} desiredCount
 * @param {Object} analysis   // Content analysis for smart selection
 */
export function renderProductSection(emailType, aesthetic, products, seed = "default", desiredCount = null, analysis = {}) {
  const want = desiredCount ?? (products?.length || 0);
  console.log(`🔍 [DEBUG] renderProductSection called:`, { emailType, aesthetic, productCount: products?.length, want, seed });

  // 1) Try skeleton location first
  const root1 = skeletonRoot(emailType);
  const counts1 = root1 ? listCounts(root1) : [];
  let baseRoot = root1;
  let counts = counts1;
  console.log(`🔍 [DEBUG] Skeleton root: ${root1}, counts: ${counts1}`);
  console.log(`🔍 [DEBUG] Skeleton root exists:`, root1 ? fs.existsSync(root1) : false);

  // 2) Fallback: legacy per-aesthetic location
  if (!counts.length) {
    const root2 = legacyAestheticRoot(emailType, aesthetic);
    const counts2 = root2 ? listCounts(root2) : [];
    baseRoot = root2;
    counts = counts2;
    console.log(`🔍 [DEBUG] Legacy root: ${root2}, counts: ${counts2}`);
    console.log(`🔍 [DEBUG] Legacy root exists:`, root2 ? fs.existsSync(root2) : false);
  }

  if (!baseRoot || !counts.length) {
    console.log(`🔍 [DEBUG] No product sections found for ${emailType}/${aesthetic}`);
    return ""; // no product sections found
  }

  const pickCount = chooseCount(counts, want);
  if (!pickCount) {
    console.log(`🔍 [DEBUG] No suitable count found for ${want} products`);
    return "";
  }

  const dirForCount = path.join(baseRoot, String(pickCount));
  const variants = listVariantFiles(dirForCount);
  if (!variants.length) {
    console.log(`🔍 [DEBUG] No variants found in ${dirForCount}`);
    return "";
  }

  console.log(`🔍 [DEBUG] Found ${variants.length} variants for ${pickCount} products`);

  const rng = seededRng(seed);
  
  // Use smart layout selection if analysis is provided
  let selectedVariant;
  if (analysis && Object.keys(analysis).length > 0) {
    const variantNames = variants.map(v => path.basename(v, path.extname(v)));
    const smartLayout = selectSmartProductLayout(variantNames, analysis, pickCount);
    const smartVariant = variants.find(v => path.basename(v, path.extname(v)) === smartLayout);
    selectedVariant = smartVariant || variants[Math.floor(rng() * variants.length)];
  } else {
    selectedVariant = variants[Math.floor(rng() * variants.length)];
  }
  
  console.log(`🔍 [DEBUG] Selected variant: ${selectedVariant}`);
  
  try {
    const tpl = fs.readFileSync(selectedVariant, "utf8");
    const slice = products.slice(0, pickCount);
    const result = fillTemplate(tpl, slice);
    console.log(`🔍 [DEBUG] Template filled successfully, result length: ${result.length}`);
    return result;
  } catch (error) {
    console.log(`🔍 [DEBUG] Error reading template or filling: ${error.message}`);
    return "";
  }
}

export default { renderProductSection };
