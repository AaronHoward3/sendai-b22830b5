// src/theme/tokens.js
// Build canonical theme tokens from payload + guardrails.

function normHex(h) {
  const s = String(h || "").trim();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return null;
  if (s.length === 4) return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
  return s.toLowerCase();
}
function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padStart(6, "0");
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function isDark(hex) { return luminance(hex) < 0.35; }
export function contrastRatio(a, b) {
  const L1 = luminance(a), L2 = luminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
export function bestTextOn(bg) {
  const whiteContrast = contrastRatio(bg, "#ffffff");
  const blackContrast = contrastRatio(bg, "#111111");
  
  // Ensure minimum contrast ratio of 4.5 for accessibility
  if (whiteContrast >= 4.5 && blackContrast >= 4.5) {
    return whiteContrast >= blackContrast ? "#ffffff" : "#111111";
  } else if (whiteContrast >= 4.5) {
    return "#ffffff";
  } else if (blackContrast >= 4.5) {
    return "#111111";
  } else {
    // If neither meets minimum contrast, choose the better one
    return whiteContrast >= blackContrast ? "#ffffff" : "#111111";
  }
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function mix(a, b, t = 0.5) {
  const H = h => h.replace("#", "");
  const A = H(a).padStart(6, "0"), B = H(b).padStart(6, "0");
  const p = x => parseInt(x, 16), to2 = v => Math.round(v).toString(16).padStart(2, "0");
  t = clamp01(t);
  const r = (1 - t) * p(A.slice(0, 2)) + t * p(B.slice(0, 2));
  const g = (1 - t) * p(A.slice(2, 4)) + t * p(B.slice(2, 4));
  const b_ = (1 - t) * p(A.slice(4, 6)) + t * p(B.slice(4, 6));
  return `#${to2(r)}${to2(g)}${to2(b_)}`;
}

function firstValidHex(...candidates) {
  for (const c of candidates.flat()) {
    const v = normHex(c);
    if (v) return v;
  }
  return null;
}

function pickFromBrand(brand) {
  if (!brand || typeof brand !== "object") return {};
  const flat = JSON.stringify(brand).toLowerCase();

  // Common keys we’ve seen in your payloads
  const primary = firstValidHex(
    brand.primary_color, brand.primaryColor, brand.primary,
    brand.link_color, brand.linkColor, brand.accent, brand.accent_color,
    (brand.colors && brand.colors[0]),
    (brand.brandData && brand.brandData.primary_color),
    (brand.brandData && brand.brandData.link_color)
  );

  const link = firstValidHex(
    brand.link_color, brand.linkColor,
    (brand.colors && brand.colors[1]),
    (brand.brandData && brand.brandData.link_color)
  );

  return { primary, link };
}

export function buildBrandTokens(payloadBrand = {}) {
  const { primary, link } = pickFromBrand(payloadBrand);

  const brand = normHex(primary) || "#6a5cff"; // sensible vivid default
  // If link is missing or same as primary, derive a distinct second stop.
  const brandAlt = (() => {
    const l = normHex(link);
    if (l && l !== brand) return l;
    return isDark(brand) ? mix(brand, "#ffffff", 0.35) : mix(brand, "#000000", 0.35);
  })();

  // Neutral scaffold defaults (dark-on-dark base; skins can override usage)
  const pageBg = "#0f1014";
  const sectionBg = "#111319";
  const cardBg = "#151824";
  const border = isDark(pageBg) ? mix(pageBg, "#ffffff", 0.12) : mix(pageBg, "#000000", 0.12);
  const text = bestTextOn(pageBg);
  const muted = isDark(pageBg) ? mix(text, "#808080", 0.5) : mix(text, "#808080", 0.5);

  const tokens = {
    brand,
    brandAlt,
    pageBg,
    sectionBg,
    cardBg,
    text,
    muted,
    border
  };

  // If cardBg too dark for a light page, align to pageBg
  if (isDark(tokens.cardBg) && !isDark(tokens.pageBg)) {
    tokens.cardBg = tokens.pageBg;
  }

  // Gradient defaults
  tokens.gradient = {
    from: tokens.brand,
    to: tokens.brandAlt,
    angle: 135
  };

  return tokens;
}
