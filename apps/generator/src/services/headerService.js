import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildBrandTokens } from "../theme/tokens.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean and normalize brand URLs for header navigation
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
 * Replace placeholder values in the header template with brand data
 * Uses theming system tokens for proper color integration
 */
function replaceHeaderPlaceholders(headerTemplate, brandData) {
  // Build brand tokens to get proper colors that work with theming
  const tokens = buildBrandTokens(brandData);
  
  return headerTemplate
    .replace(/\[\[logo_url\]\]/g, brandData.logo_url || brandData.logo || '')
    .replace(/\[\[store_name\]\]/g, brandData.store_name || brandData.name || brandData.title || 'Brand')
    .replace(/\[\[store_url\]\]/g, brandData.store_url || '')
    .replace(/\[\[body_color\]\]/g, tokens.pageBg)
    .replace(/\[\[text_color\]\]/g, tokens.text)
    .replace(/\[\[link_color\]\]/g, tokens.brand)
    .replace(/\[\[divider_color\]\]/g, tokens.border);
}

/**
 * Process the header template with brand data
 * Similar to processFooterTemplate but for headers
 */
export async function processHeaderTemplate(brandData) {
  try {
    const headerPath = path.join(__dirname, '../../lib/design-elements/header.txt');
    const headerTemplate = await fs.readFile(headerPath, 'utf8');
    const cleanedBrandData = cleanBrandUrls({ ...brandData });
    const processedHeader = replaceHeaderPlaceholders(headerTemplate, cleanedBrandData);
    return processedHeader;
  } catch (error) {
    console.error('Error processing header template:', error);
    return '';
  }
}
