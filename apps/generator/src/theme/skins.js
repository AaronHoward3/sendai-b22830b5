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

export function makeSkin(tokens, skinIdRaw) {
  const skinId = resolveSkinId(skinIdRaw);

  // Base defaults shared by most skins
  const base = {
    id: skinId,
    fonts: {
      heading: { name: "Inter", hrefs: [
        "https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap"
      ] },
      body: { name: "Inter", hrefs: [
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
      ] }
    },
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
    radii: { card: 0, img: 0, btn: 0 },
    // Buttons
    buttons: {
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
      base.radii = { card: 0, img: 0, btn: 0 };
      base.buttons.variant = "outline";
      base.extras.colorOverrides = false;
    }
    if (skinId === "neo_brutalist") {
      base.radii = { card: 0, img: 0, btn: 0 };
      base.buttons.variant = "ghost";
      base.extras.colorOverrides = false;
    }
    return base;
  }

  // Per-skin definitions
  switch (skinId) {
    case "bold_contrasting": {
      // Sans everywhere; BIG, THICK headings & titles
      base.fonts.heading = {
        name: "Inter",
        hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap"],
        isSerif: false
      };
      base.fonts.body = {
        name: "Inter",
        hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"],
        isSerif: false
      };

      // Extra-large, extra-bold headings
      base.h1 = { size: 56, weight: 900 };
      base.h2 = { size: 34, weight: 900 };
      base.bodySize = 17;
      base.typography = { ...base.typography, h1LS: -0.02, h2LS: -0.01, capsHeadings: false };

      // Shape & visuals (square images + square buttons)
      base.radii = { card: 14, img: 0, btn: 0 };

      // Buttons stay bold but not shouty
      base.buttons = { ...base.buttons, variant: "filled", pad: "16px 24px", caps: false, letterSpacing: 0.02 };

      // Images: wide
      base.img = { width: 580 };

      // Cards a bit tighter so big images feel flush
      base.space = { cardPad: 20 };
      base.shadow = { card: "0 12px 36px rgba(0,0,0,.24)" };

      // Keep the dark slab look for sections
      base.extras.slabMode = "dark";
      const brandDark = isDark(tokens.brand);
      const altDark = isDark(tokens.brandAlt || tokens.brand);
      base.extras.slabColor = brandDark ? tokens.brand : (altDark ? (tokens.brandAlt || tokens.brand) : "#111111");
      break;
    }

    case "gradient_glow": {
      base.h1 = { size: 44, weight: 800 };
      base.h2 = { size: 26, weight: 700 };
      base.radii = { card: 16, img: 16, btn: 9999 };
      base.buttons = { ...base.buttons, variant: "gradient", pad: "14px 22px", caps: true, letterSpacing: 0.06 };
      base.img = { width: 540 };
      base.space = { cardPad: 28 };
      base.shadow = { card: "0 8px 24px rgba(0,0,0,.12)" };
      base.typography = { ...base.typography, h1LS: 0, h2LS: 0, capsHeadings: false };
      base.extras.globalGradient = true;
      base.extras.buttonContrastFromBg = true;

      // Ensure we have distinct gradient colors
      let g1 = tokens.gradient.from;
      let g2 = tokens.gradient.to;
      if (!g2 || g2.toLowerCase() === g1.toLowerCase()) g2 = deriveSecondStop(g1);
      
      // Make gradient more dramatic by ensuring good contrast
      base.pattern = { 
        kind: "linear", 
        grad1: g1, 
        grad2: g2, 
        angle: 135 // Fixed angle for better visibility
      };
      break;
    }

    case "warm_editorial": {
      // Serif-only: headings + body (bold titles, regular body)
      base.fonts.heading = {
        name: "Playfair Display",
        hrefs: ["https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap"],
        isSerif: true
      };
      base.fonts.body = {
        name: "Merriweather",
        hrefs: ["https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap"],
        isSerif: true
      };

      base.h1 = { size: 40, weight: 700 };
      base.h2 = { size: 26, weight: 700 };
      base.bodySize = 16;

      base.radii = { card: 8, img: 1, btn: 6 };
      base.buttons = { ...base.buttons, variant: "outline", pad: "12px 20px", caps: false, letterSpacing: 0.02 };
      base.img = { width: 520 };
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 6px 20px rgba(0,0,0,.10)" };
      base.typography = { ...base.typography, h1LS: 0, h2LS: 0, capsHeadings: false };
      break;
    }

    case "magazine_serif": {
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
      base.h1 = { size: 44, weight: 700 };
      base.h2 = { size: 28, weight: 700 };
      base.bodySize = 17;
      base.radii = { card: 15, img: 15, btn: 15 };
      base.buttons = { ...base.buttons, variant: "filled", pad: "12px 20px", caps: false, letterSpacing: 0.01 };
      base.img = { width: 520 };
      base.space = { cardPad: 24 };
      base.shadow = { card: "0 6px 20px rgba(0,0,0,.12)" };
      base.typography = { ...base.typography, h1LS: 0.01, h2LS: 0, capsHeadings: false };
      break;
    }

    case "pastel_soft": {
      base.h1 = { size: 34, weight: 700 };
      base.h2 = { size: 22, weight: 600 };
      base.bodySize = 15;
      base.radii = { card: 12, img: 12, btn: 12 };
      base.buttons = { ...base.buttons, variant: "ghost", pad: "12px 18px", caps: false, letterSpacing: 0.02 };
      base.img = { width: 480 };
      base.space = { cardPad: 20 };
      base.shadow = { card: "0 4px 16px rgba(0,0,0,.08)" };
      base.typography = { ...base.typography, h1LS: 0, h2LS: 0, capsHeadings: false };
      break;
    }

    default: {
      // minimal_clean & unknown → gentle defaults
      base.radii = { card: 0, img: 0, btn: 0 };
      base.buttons.variant = "filled";
    }
  }

  return base;
}
