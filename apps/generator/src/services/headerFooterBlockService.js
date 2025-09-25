// src/services/headerFooterBlockService.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildBrandTokens } from "../theme/tokens.js";
import { makeSkin } from "../theme/skins.js";
import { applyTheme } from "../theme/applyTheme.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root → lib
function libRoot() {
  return path.resolve(__dirname, "..", "..", "lib");
}

function aestheticSearchOrder(requested) {
  const req = String(requested || "").trim().toLowerCase().replace(/\s+/g, "_");
  const order = ["skeleton"];
  if (req && req !== "skeleton") order.push(req);
  order.push("minimal_clean", "bold_contrasting", "default");
  return Array.from(new Set(order));
}

async function fileExists(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

/**
 * Clean and normalize brand URLs for header/footer navigation
 */
function cleanBrandUrls(brandData) {
  const cleaned = { ...brandData };
  
  // Ensure we have a valid store URL
  const storeUrl = cleaned.store_url || 
                   cleaned.website || 
                   cleaned.brandUrl || 
                   cleaned.url || 
                   cleaned.homepage || 
                   '';
  
  // Clean up the URL - remove trailing slashes and ensure it's a proper URL
  if (storeUrl && typeof storeUrl === 'string') {
    cleaned.store_url = storeUrl.replace(/\/+$/, '');
    if (!cleaned.store_url.startsWith('http')) {
      cleaned.store_url = `https://${cleaned.store_url}`;
    }
  }
  
  return cleaned;
}

/**
 * Replace placeholder values in header/footer templates with brand data
 * Now includes full skin theming for consistent styling
 */
function replaceHeaderFooterPlaceholders(template, brandData, aesthetic = "minimal_clean") {
  // Build brand tokens and skin for full theming
  const tokens = buildBrandTokens(brandData);
  const skin = makeSkin(tokens, aesthetic);
  
  // Determine brand information
  const hasLogo = brandData.logo_url || brandData.logo;
  const logoUrl = brandData.logo_url || brandData.logo || '';
  const storeName = brandData.store_name || brandData.name || brandData.title || 'Brand';
  const storeUrl = brandData.store_url || '';
  const storeAddress = brandData.store_address || brandData.address || '';
  const unsubscribe = brandData.unsubscribe_url || '#unsubscribe';
  
  let processedTemplate = template;
  
  // Replace all placeholders with skin-aware colors
  processedTemplate = processedTemplate
    .replace(/\[\[logo_url\]\]/g, logoUrl)
    .replace(/\[\[store_name\]\]/g, storeName)
    .replace(/\[\[store_url\]\]/g, storeUrl)
    .replace(/\[\[store_address\]\]/g, storeAddress)
    .replace(/\[\[unsubscribe\]\]/g, unsubscribe)
    .replace(/\[\[body_color\]\]/g, skin.palette.sectionBg)
    .replace(/\[\[text_color\]\]/g, skin.palette.text)
    .replace(/\[\[link_color\]\]/g, skin.palette.brand)
    .replace(/\[\[divider_color\]\]/g, skin.palette.border);
  
  return processedTemplate;
}

/**
 * List available header block files for a given aesthetic
 */
export async function listHeaderBlockFiles(aesthetic) {
  const order = aestheticSearchOrder(aesthetic);
  
  for (const aest of order) {
    const baseDir = path.join(libRoot(), "design-elements", "header-blocks", aest);
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".txt"))
        .map((e) => e.name)
        .sort();
      
      if (files.length > 0) {
        return files;
      }
    } catch {
      continue;
    }
  }
  
  throw new Error(`No header block files found for aesthetic: ${aesthetic}`);
}

/**
 * List available footer block files for a given aesthetic
 */
export async function listFooterBlockFiles(aesthetic) {
  const order = aestheticSearchOrder(aesthetic);
  
  for (const aest of order) {
    const baseDir = path.join(libRoot(), "design-elements", "footer-blocks", aest);
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".txt"))
        .map((e) => e.name)
        .sort();
      
      if (files.length > 0) {
        return files;
      }
    } catch {
      continue;
    }
  }
  
  throw new Error(`No footer block files found for aesthetic: ${aesthetic}`);
}

/**
 * Read and process a header block file
 */
export async function readHeaderBlockFile(aesthetic, filename, brandData) {
  const order = aestheticSearchOrder(aesthetic);
  
  for (const aest of order) {
    const filePath = path.join(libRoot(), "design-elements", "header-blocks", aest, filename);
    if (await fileExists(filePath)) {
      const template = await fs.readFile(filePath, "utf8");
      const cleanedBrandData = cleanBrandUrls({ ...brandData });
      const processedTemplate = replaceHeaderFooterPlaceholders(template, cleanedBrandData, aesthetic);
      return processedTemplate;
    }
  }
  
  throw new Error(`Header block file not found: ${aesthetic}/${filename}`);
}

/**
 * Read and process a footer block file
 */
export async function readFooterBlockFile(aesthetic, filename, brandData) {
  const order = aestheticSearchOrder(aesthetic);
  
  for (const aest of order) {
    const filePath = path.join(libRoot(), "design-elements", "footer-blocks", aest, filename);
    if (await fileExists(filePath)) {
      const template = await fs.readFile(filePath, "utf8");
      const cleanedBrandData = cleanBrandUrls({ ...brandData });
      const processedTemplate = replaceHeaderFooterPlaceholders(template, cleanedBrandData, aesthetic);
      return processedTemplate;
    }
  }
  
  throw new Error(`Footer block file not found: ${aesthetic}/${filename}`);
}

/**
 * Generate a random header block
 */
export async function generateHeaderBlock(aesthetic, brandData) {
  const files = await listHeaderBlockFiles(aesthetic);
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return await readHeaderBlockFile(aesthetic, randomFile, brandData);
}

/**
 * Generate a random footer block
 */
export async function generateFooterBlock(aesthetic, brandData) {
  const files = await listFooterBlockFiles(aesthetic);
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return await readFooterBlockFile(aesthetic, randomFile, brandData);
}
