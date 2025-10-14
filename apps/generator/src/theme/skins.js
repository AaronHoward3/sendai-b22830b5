// src/theme/skins.js
// Skins are pure transforms of tokens → theme pack (rules).

import { isDark } from "./tokens.js";

const EXEMPT = new Set([]);

export function resolveSkinId(v) {
  const id = (v || "minimal_clean").toString().trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    "bold contrasting": "bold_contrasting",
    "bold-contrasting": "bold_contrasting",
    serif: "magazine_serif",
    editorial: "warm_editorial",
    warm: "warm_editorial",
    minimal: "minimal_clean"
  };
  return aliases[id] || id;
}

function deriveSecondStop(c1) {
  // Ensure the gradient shows clearly even when brand==brandAlt
  return isDark(c1) ? lighten(c1, 0.28) : darken(c1, 0.28);
}
function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padStart(6, "0");
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function rgbToHex({ r, g, b }) { const to2 = v => Math.round(v).toString(16).padStart(2, "0"); return `#${to2(r)}${to2(g)}${to2(b)}`; }
function lighten(hex, t) { const { r, g, b } = hexToRgb(hex); t = clamp01(t); return rgbToHex({ r: r + (255 - r) * t, g: g + (255 - g) * t, b: b + (255 - b) * t }); }
function darken(hex, t) { const { r, g, b } = hexToRgb(hex); t = clamp01(t); return rgbToHex({ r: r * (1 - t), g: g * (1 - t), b: b * (1 - t) }); }

export function makeSkin(tokens, skinIdRaw, brandStyleManifest = null) {
  const skinId = resolveSkinId(skinIdRaw);

  // Use brand fonts from style manifest if available, otherwise use defaults
  const getBrandFonts = () => {
    if (brandStyleManifest?.fonts) {
      return {
        heading: brandStyleManifest.fonts.heading || { name: "Inter", hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap"], isSerif: false },
        body: brandStyleManifest.fonts.body || { name: "Inter", hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"], isSerif: false }
      };
    }
    
    // If no brand style manifest, check if we have brand data with fonts
    // This handles cases where CSS scraping fails but brand data has fonts
    if (tokens?.brandData?.fonts) {
      const brandFonts = tokens.brandData.fonts;
      return {
        heading: { 
          name: brandFonts.heading || brandFonts.title || "Inter", 
          hrefs: brandFonts.font_urls || [], 
          isSerif: false 
        },
        body: { 
          name: brandFonts.body || "Inter", 
          hrefs: brandFonts.font_urls || [], 
          isSerif: false 
        }
      };
    }
    
    return {
      heading: { name: "Inter", hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap"], isSerif: false },
      body: { name: "Inter", hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"], isSerif: false }
    };
  };

  const brandFonts = getBrandFonts();

  // NO hardcoded font overrides - ALWAYS use brand fonts
  // Skins should NEVER override fonts - only scraped CSS fonts should be used

  // Helper function to get radii for a skin, prioritizing skin-specific overrides
  const getSkinRadii = (skinRadii) => {
    if (brandStyleManifest?.radii) {
      // Use skin-specific overrides first, then brand radii, then defaults
      const result = {
        card: skinRadii?.card ?? brandStyleManifest.radii.card ?? 8,
        img: skinRadii?.img ?? brandStyleManifest.radii.img ?? 6,
        btn: skinRadii?.btn ?? brandStyleManifest.radii.btn ?? 6
      };
      console.log(`🔘 [RADII DEBUG] Skin: ${skinId}, Brand radii:`, brandStyleManifest.radii, `Skin radii:`, skinRadii, `Final:`, result);
      return result;
    }
    
    // No brand radii, use skin defaults
    const result = skinRadii || { card: 8, img: 6, btn: 6 };
    console.log(`🔘 [RADII DEBUG] Skin: ${skinId}, No brand radii, using:`, result);
    return result;
  };

  // NO hardcoded button style overrides - ALWAYS use brand button styles
  // Skins should NEVER override button styles - only scraped CSS button styles should be used

  // Base defaults shared by most skins
  const base = {
    id: skinId,
    fonts: brandFonts,
    palette: {
      pageBg: tokens.pageBg,
      sectionBg: tokens.sectionBg,
      text: tokens.text,
      muted: tokens.muted,
      brand: tokens.brand,
      brandAlt: tokens.brandAlt || tokens.brand,
      border: tokens.border,
      cardBg: tokens.cardBg
    },
    // Type scale
    h1: { size: 42, weight: 800 },
    h2: { size: 28, weight: 700 },
    bodySize: 16,
    typography: { h1LS: 0, h2LS: 0, capsHeadings: false }, // em letter-spacing + uppercase
    border: { width: 1, style: "solid" },
    // Shape
    radii: getSkinRadii({ card: 0, img: 0, btn: 0 }),
    // Buttons - ALWAYS use brand button styles, NO hardcoded overrides
    buttons: brandStyleManifest?.buttons || {
      variant: "filled",                 // filled | outline | ghost | gradient
      pad: "14px 22px",
      caps: false,
      letterSpacing: 0                   // em
    },
    // Imagery
    img: { width: 520, padding: 0 },
    // Spacing
    space: { cardPad: 24 },
    // Visual accents
    shadow: { card: "" },
    // Extra behavior flags
    extras: {
      colorOverrides: true,              // normalize hardcoded colors inside blocks
      buttonContrastFromBg: false,
      globalGradient: false,             // gradient_glow toggles this
      slabMode: null,                    // "dark" | null
      slabColor: null
    },
    pattern: null // gradient info
  };

  // Per-skin definitions
  switch (skinId) {
    case "bold_contrasting": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced typography with better hierarchy and spacing
      base.h1 = { size: 64, weight: 900 };
      base.h2 = { size: 38, weight: 800 };
      base.h3 = { size: 28, weight: 700 };
      base.bodySize = 18;
      base.typography = { 
        ...base.typography, 
        h1LS: -0.03, 
        h2LS: -0.02, 
        h3LS: -0.01,
        capsHeadings: false,
        lineHeight: 1.2  // Better line height to prevent squishing
      };

      // Sharp elements with no border radius for bold contrasting look
      base.radii = getSkinRadii({ card: 0, img: 0, btn: 0 });

      // NO button overrides - use brand button styles only

      // Optimized image sizing with no padding for sharp look
      base.img = { width: 600, padding: 0 };

      // Improved spacing and shadows
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 20px 60px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.15)" };

      // Enhanced dark palette - ALWAYS use dark backgrounds for bold contrasting
      base.palette = {
        pageBg: "#0a0b0f",        // Deep dark background
        sectionBg: "#111319",      // Rich dark sections
        text: "#ffffff",           // Pure white text for maximum contrast
        muted: "#b8bcc8",         // Light gray muted text
        brand: tokens.brand,       // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#2a2d35",        // Subtle dark border
        cardBg: "#1a1d26"         // Rich dark cards
      };

      // Enhanced dark slab look
      base.extras.slabMode = "dark";
      const brandDark = isDark(tokens.brand);
      const altDark = isDark(tokens.brandAlt || tokens.brand);
      base.extras.slabColor = brandDark ? tokens.brand : (altDark ? (tokens.brandAlt || tokens.brand) : "#1a1d26");
      break;
    }

    case "warm_editorial": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced editorial typography
      base.h1 = { size: 44, weight: 800 };
      base.h2 = { size: 28, weight: 700 };
      base.bodySize = 18;
      base.typography = { ...base.typography, h1LS: 0.01, h2LS: 0.01, capsHeadings: false };

      // Refined elements with specific radii
      base.radii = getSkinRadii({ card: 16, img: 3, btn: 5 });  // img: 3 (0-5 range), btn: 5
      
      // Clear bordered button style
      base.buttons = {
        variant: "outline",  // Clear with border
        pad: "14px 22px",
        caps: false,
        letterSpacing: 0
      };
      
      // Optimized image sizing with padding
      base.img = { width: 520, padding: 10 };
      
      // Enhanced spacing and shadows
      base.space = { cardPad: 32 };
      base.shadow = { card: "0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)" };

      // Refined warm color palette with scraped colors
      const scrapedBg = brandStyleManifest?.palette?.pageBg;
      const scrapedText = brandStyleManifest?.palette?.text;
      const scrapedMuted = brandStyleManifest?.palette?.muted;
      
      base.palette = {
        pageBg: scrapedBg || "#fafafa",      // Use scraped background or soft warm
        sectionBg: scrapedBg || "#ffffff",   // Use scraped background or clean white
        text: scrapedText || "#1a1a1a",      // Use scraped text or rich dark
        muted: scrapedMuted || "#6b7280",    // Use scraped muted or sophisticated gray
        brand: tokens.brand,                 // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: brandStyleManifest?.palette?.border || "#e5e7eb",  // Use scraped border or subtle warm
        cardBg: scrapedBg || "#ffffff"       // Use scraped background or clean white cards
      };
      break;
    }

    case "magazine_serif": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced sophisticated typography with elegant tracking and leading
      base.h1 = { size: 48, weight: 500 };  // Reduced from 700 to 500 for elegance
      base.h2 = { size: 30, weight: 400 };  // Reduced from 600 to 400 for refinement
      base.h3 = { size: 24, weight: 300 };  // Reduced from 500 to 300 for subtlety
      base.bodySize = 17;
      base.typography = { 
        ...base.typography, 
        h1LS: 0.03,     // Increased letter spacing for elegance
        h2LS: 0.02,     // Better tracking for headings
        h3LS: 0.01,     // Subtle spacing for subheadings
        capsHeadings: false,
        lineHeight: 1.4  // Better leading for breathability
      };

      // Refined elegant elements with specific radii
      base.radii = getSkinRadii({ card: 12, img: 0, btn: 5 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized magazine image sizing with padding
      base.img = { width: 500, padding: 15 };
      
      // Enhanced structured spacing
      base.space = { cardPad: 36 };
      base.shadow = { card: "0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)" };

      // Enhanced sophisticated color palette with white backgrounds
      const scrapedBg = brandStyleManifest?.palette?.pageBg;
      const scrapedText = brandStyleManifest?.palette?.text;
      const scrapedMuted = brandStyleManifest?.palette?.muted;
      
      base.palette = {
        pageBg: scrapedBg || "#ffffff",      // Use scraped background or pure white
        sectionBg: scrapedBg || "#ffffff",   // Use scraped background or pure white
        text: scrapedText || "#1a1a1a",     // Use scraped text or rich black
        muted: scrapedMuted || "#4a5568",   // Use scraped muted or sophisticated gray
        brand: tokens.brand,                 // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: brandStyleManifest?.palette?.border || "#e2e8f0",  // Use scraped border or subtle refined
        cardBg: scrapedBg || "#ffffff"       // Use scraped background or pure white cards
      };
      break;
    }

    case "minimal_clean": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced minimal typography
      base.h1 = { size: 44, weight: 800 };
      base.h2 = { size: 26, weight: 700 };
      base.bodySize = 17;
      base.typography = { ...base.typography, h1LS: -0.02, h2LS: -0.01, capsHeadings: false };

      // Subtle rounded elements for modern feel
      base.radii = getSkinRadii({ card: 8, img: 12, btn: 50 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized image sizing
      base.img = { width: 540, padding: 10 };
      
      // Enhanced minimal spacing
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 2px 8px rgba(0,0,0,.04)" }; // Subtle shadow for depth

      // Enhanced clean color palette with scraped colors
      const scrapedBg = brandStyleManifest?.palette?.pageBg;
      const scrapedText = brandStyleManifest?.palette?.text;
      const scrapedMuted = brandStyleManifest?.palette?.muted;
      
      base.palette = {
        pageBg: scrapedBg || "#ffffff",      // Use scraped background or pure white
        sectionBg: scrapedBg || "#ffffff",   // Use scraped background or pure white
        text: scrapedText || "#111827",      // Use scraped text or rich black
        muted: scrapedMuted || "#6b7280",    // Use scraped muted or sophisticated gray
        brand: tokens.brand,                 // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: brandStyleManifest?.palette?.border || "#e5e7eb",  // Use scraped border or subtle refined
        cardBg: scrapedBg || "#ffffff"       // Use scraped background or pure white cards
      };
      
      base.extras.colorOverrides = true; // Enable color overrides for better contrast
      break;
    }

    case "modern_glass": {
      // Modern glass morphism design
      base.fonts.heading = {
        name: "Inter",
        hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap"],
        isSerif: false
      };
      base.fonts.body = {
        name: "Inter",
        hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"],
        isSerif: false
      };

      // Modern glass typography
      base.h1 = { size: 46, weight: 800 };
      base.h2 = { size: 28, weight: 700 };
      base.bodySize = 17;
      base.typography = { ...base.typography, h1LS: -0.02, h2LS: -0.01, capsHeadings: false };

      // Glass morphism elements
      base.radii = getSkinRadii({ card: 20, img: 16, btn: 12 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized image sizing
      base.img = { width: 540 };
      
      // Enhanced spacing
      base.space = { cardPad: 28 };
      base.shadow = { card: "0 8px 32px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.05)" };

      // Glass morphism color palette
      base.palette = {
        pageBg: "#f1f5f9",      // Light glass background
        sectionBg: "rgba(255,255,255,0.8)",   // Semi-transparent sections
        text: "#1e293b",        // Rich dark text
        muted: "#64748b",        // Glass gray
        brand: tokens.brand,     // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "rgba(255,255,255,0.2)",      // Glass border
        cardBg: "rgba(255,255,255,0.9)"       // Glass cards
      };
      
      base.extras.colorOverrides = true;
      break;
    }

    case "neon_cyber": {
      // Cyberpunk neon design
      base.fonts.heading = {
        name: "Orbitron",
        hrefs: ["https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap"],
        isSerif: false
      };
      base.fonts.body = {
        name: "Inter",
        hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"],
        isSerif: false
      };

      // Cyber typography
      base.h1 = { size: 50, weight: 900 };
      base.h2 = { size: 30, weight: 800 };
      base.bodySize = 16;
      base.typography = { ...base.typography, h1LS: 0.02, h2LS: 0.01, capsHeadings: true };

      // Sharp cyber elements
      base.radii = getSkinRadii({ card: 4, img: 0, btn: 0 });
      
      // NO button overrides - use brand button styles only
      
      // Cyber image sizing
      base.img = { width: 580 };
      
      // Tight cyber spacing
      base.space = { cardPad: 20 };
      base.shadow = { card: "0 0 20px rgba(0,255,255,0.3), 0 0 40px rgba(0,255,255,0.1)" };

      // Cyber color palette
      base.palette = {
        pageBg: "#0a0a0a",      // Deep black
        sectionBg: "#111111",    // Dark sections
        text: "#00ffff",         // Cyan text
        muted: "#888888",        // Gray muted
        brand: tokens.brand,     // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#333333",       // Dark borders
        cardBg: "#1a1a1a"        // Dark cards
      };
      
      base.extras.colorOverrides = true;
      break;
    }

    default: {
      // unknown → gentle defaults
      base.radii = getSkinRadii({ card: 0, img: 0, btn: 0 });
      // NO button overrides - use brand button styles only
    }
  }

  return base;
}
