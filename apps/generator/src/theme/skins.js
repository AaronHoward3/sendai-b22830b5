// src/theme/skins.js
// Skins are pure transforms of tokens → theme pack (rules).

import { isDark } from "./tokens.js";

const EXEMPT = new Set(["luxe_mono", "neo_brutalist"]);

export function resolveSkinId(v) {
  const id = (v || "minimal_clean").toString().trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = {
    gradient: "gradient_glow",
    "bold contrasting": "bold_contrasting",
    "bold-contrasting": "bold_contrasting",
    brutalist: "neo_brutalist",
    luxe: "luxe_mono",
    serif: "magazine_serif",
    editorial: "warm_editorial",
    warm: "warm_editorial",
    pastel: "pastel_soft",
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

  // Helper function to get radii for a skin, respecting brand radii
  const getSkinRadii = (skinRadii) => {
    if (brandStyleManifest?.radii) {
      // Use brand radii as base, but allow skin-specific overrides
      return {
        card: brandStyleManifest.radii.card || skinRadii?.card || 8,
        img: brandStyleManifest.radii.img || skinRadii?.img || 6,
        btn: brandStyleManifest.radii.btn || skinRadii?.btn || 6
      };
    }
    
    // No brand radii, use skin defaults
    return skinRadii || { card: 8, img: 6, btn: 6 };
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
    img: { width: 520 },
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

  // EXEMPT skins keep their own stark rules
  if (EXEMPT.has(skinId)) {
    if (skinId === "luxe_mono") {
      // Only override fonts if no brand fonts are provided
      if (!brandStyleManifest?.fonts) {
        base.fonts.heading = {
          name: "Playfair Display",
          hrefs: [
            "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap"
          ],
          isSerif: true
        };
        base.fonts.body = {
          name: "Georgia",
          hrefs: [],
          isSerif: true
        };
      }
      
      // Override palette to pure black and white
      base.palette = {
        pageBg: "#000000",      // Black background
        sectionBg: "#000000",   // Black sections
        text: "#ffffff",        // White text
        muted: "#cccccc",       // Light gray muted text
        brand: "#ffffff",       // White brand color
        brandAlt: "#ffffff",    // White brand alt
        border: "#ffffff",      // White borders
        cardBg: "#000000"       // Black cards
      };
      
      base.radii = getSkinRadii({ card: 0, img: 0, btn: 0 });
      // NO button overrides - use brand button styles only
      base.extras.colorOverrides = true; // Enable color overrides for black/white enforcement
    }
    if (skinId === "neo_brutalist") {
      base.radii = getSkinRadii({ card: 0, img: 0, btn: 0 });
      // NO button overrides - use brand button styles only
      base.extras.colorOverrides = false;
    }
    return base;
  }

  // Per-skin definitions
  switch (skinId) {
    case "bold_contrasting": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced typography with better hierarchy
      base.h1 = { size: 64, weight: 900 };
      base.h2 = { size: 38, weight: 800 };
      base.bodySize = 18;
      base.typography = { ...base.typography, h1LS: -0.03, h2LS: -0.02, capsHeadings: false };

      // Modern rounded elements with subtle shadows
      base.radii = getSkinRadii({ card: 20, img: 12, btn: 8 });

      // NO button overrides - use brand button styles only

      // Optimized image sizing
      base.img = { width: 600 };

      // Improved spacing and shadows
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 20px 60px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.15)" };

      // Enhanced dark palette with better contrast
      base.palette = {
        pageBg: "#0a0b0f",      // Deeper dark background
        sectionBg: "#111319",    // Rich dark sections
        text: "#ffffff",         // Pure white text
        muted: "#b8bcc8",        // Better contrast muted text
        brand: tokens.brand,     // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#2a2d35",       // Subtle dark borders
        cardBg: "#1a1d26"        // Rich dark cards
      };

      // Enhanced dark slab look
      base.extras.slabMode = "dark";
      const brandDark = isDark(tokens.brand);
      const altDark = isDark(tokens.brandAlt || tokens.brand);
      base.extras.slabColor = brandDark ? tokens.brand : (altDark ? (tokens.brandAlt || tokens.brand) : "#1a1d26");
      break;
    }

    case "gradient_glow": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced gradient typography
      base.h1 = { size: 52, weight: 900 };
      base.h2 = { size: 32, weight: 800 };
      base.bodySize = 17;
      base.radii = getSkinRadii({ card: 24, img: 20, btn: 50 });
      // NO button overrides - use brand button styles only
      base.img = { width: 560 };
      base.space = { cardPad: 32 };
      base.shadow = { card: "0 16px 40px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.1)" };
      base.typography = { ...base.typography, h1LS: -0.02, h2LS: -0.01, capsHeadings: false };
      base.extras.globalGradient = true;
      base.extras.buttonContrastFromBg = true;

      // Enhanced gradient with better color stops
      let g1 = tokens.gradient.from;
      let g2 = tokens.gradient.to;
      if (!g2 || g2.toLowerCase() === g1.toLowerCase()) g2 = deriveSecondStop(g1);
      
      // More dramatic gradient with better angles
      base.pattern = { 
        kind: "linear", 
        grad1: g1, 
        grad2: g2, 
        angle: 120 // Better angle for modern look
      };
      break;
    }

    case "warm_editorial": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced editorial typography
      base.h1 = { size: 44, weight: 800 };
      base.h2 = { size: 28, weight: 700 };
      base.bodySize = 18;
      base.typography = { ...base.typography, h1LS: 0.01, h2LS: 0.01, capsHeadings: false };

      // Refined rounded elements
      base.radii = getSkinRadii({ card: 16, img: 12, btn: 24 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized image sizing
      base.img = { width: 520 };
      
      // Enhanced spacing and shadows
      base.space = { cardPad: 32 };
      base.shadow = { card: "0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)" };

      // Refined warm color palette
      base.palette = {
        pageBg: "#fafafa",      // Soft warm background
        sectionBg: "#ffffff",   // Clean white sections
        text: "#1a1a1a",       // Rich dark text
        muted: "#6b7280",       // Sophisticated gray
        brand: tokens.brand,    // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#e5e7eb",      // Subtle warm border
        cardBg: "#ffffff"       // Clean white cards
      };
      break;
    }

    case "magazine_serif": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced sophisticated typography
      base.h1 = { size: 48, weight: 700 };
      base.h2 = { size: 30, weight: 600 };
      base.bodySize = 17;
      base.typography = { ...base.typography, h1LS: 0.02, h2LS: 0.01, capsHeadings: false };

      // Refined elegant elements
      base.radii = getSkinRadii({ card: 12, img: 6, btn: 6 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized magazine image sizing
      base.img = { width: 500 };
      
      // Enhanced structured spacing
      base.space = { cardPad: 36 };
      base.shadow = { card: "0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)" };

      // Enhanced sophisticated color palette
      base.palette = {
        pageBg: "#fefefe",      // Warm white
        sectionBg: "#ffffff",   // Clean white sections
        text: "#1a1a1a",       // Rich black text
        muted: "#4a5568",       // Sophisticated gray
        brand: tokens.brand,    // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#e2e8f0",      // Subtle refined border
        cardBg: "#ffffff"       // Clean white cards
      };
      break;
    }

    case "pastel_soft": {
      // NO font overrides - ALWAYS use brand fonts from CSS scraping

      // Enhanced soft typography
      base.h1 = { size: 40, weight: 700 };
      base.h2 = { size: 26, weight: 600 };
      base.bodySize = 17;
      base.typography = { ...base.typography, h1LS: 0, h2LS: 0, capsHeadings: false };

      // Enhanced rounded elements
      base.radii = getSkinRadii({ card: 24, img: 20, btn: 30 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized image sizing
      base.img = { width: 520 };
      
      // Enhanced airy spacing
      base.space = { cardPad: 28 };
      base.shadow = { card: "0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)" };

      // Enhanced soft color palette
      base.palette = {
        pageBg: "#f8fafc",      // Soft light background
        sectionBg: "#ffffff",   // Clean white sections
        text: "#1e293b",       // Rich dark text
        muted: "#64748b",       // Soft sophisticated gray
        brand: tokens.brand,    // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#e2e8f0",      // Soft border
        cardBg: "#ffffff"       // Clean white cards
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
      base.radii = getSkinRadii({ card: 8, img: 4, btn: 6 });
      
      // NO button overrides - use brand button styles only
      
      // Optimized image sizing
      base.img = { width: 540 };
      
      // Enhanced minimal spacing
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 2px 8px rgba(0,0,0,.04)" }; // Subtle shadow for depth

      // Enhanced clean color palette
      base.palette = {
        pageBg: "#ffffff",      // Pure white background
        sectionBg: "#ffffff",   // Pure white sections
        text: "#111827",        // Rich black text
        muted: "#6b7280",       // Sophisticated gray
        brand: tokens.brand,    // Keep brand color
        brandAlt: tokens.brandAlt || tokens.brand,
        border: "#e5e7eb",      // Subtle refined border
        cardBg: "#ffffff"       // Pure white cards
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
