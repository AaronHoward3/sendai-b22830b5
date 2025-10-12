// src/services/brandStyleBuilder.js
// Build a brand-aware "Email Style Manifest" from a payload and optional site URL.
// - Scrapes homepage + linked CSS for fonts, colors, radii hints
// - Normalizes into a safe schema for email (fonts w/ <mj-font>, palette w/ contrast)
// - Optionally asks a small LLM step to reconcile/complete ambiguous bits
//
// This file is standalone and safe to drop in. It doesn't force controller changes;
// applyTheme() will automatically use manifest data if present on the brand object
// as `brand._styleManifest`. If you want stronger results, wire this in your controller
// to populate that field before theming.

import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

// ---- small utils ----
const isHex = (s) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s || "").trim());
const normHex = (h) => {
  const s = String(h || "").trim();
  if (!isHex(s)) return null;
  if (s.length === 4) return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
  return s.toLowerCase();
};
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padStart(6, "0");
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lin(v){ v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
function luminance(hex){ const {r,g,b}=hexToRgb(hex); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); }
function contrastRatio(a,b){ const L1=luminance(a),L2=luminance(b); const [hi,lo]=L1>L2?[L1,L2]:[L2,L1]; return (hi+0.05)/(lo+0.05); }
function bestTextOn(bg){
  const white=contrastRatio(bg,"#ffffff"); const black=contrastRatio(bg,"#111111");
  if (white>=4.5 && black>=4.5) return white>=black?"#ffffff":"#111111";
  if (white>=4.5) return "#ffffff";
  if (black>=4.5) return "#111111";
  return white>=black?"#ffffff":"#111111";
}
function mix(a,b,t=0.5){
  const H=h=>h.replace("#",""); const A=H(a).padStart(6,"0"), B=H(b).padStart(6,"0");
  const p=x=>parseInt(x,16), to2=v=>Math.round(v).toString(16).padStart(2,"0");
  t=clamp01(t);
  const r=(1-t)*p(A.slice(0,2))+t*p(B.slice(0,2));
  const g=(1-t)*p(A.slice(2,4))+t*p(B.slice(2,4));
  const b_=(1-t)*p(A.slice(4,6))+t*p(B.slice(4,6));
  return `#${to2(r)}${to2(g)}${to2(b_)}`;
}

// Map a brand font to an email-safe family + optional Google Font hrefs
export function mapFontToEmailSafe(name = "") {
  const n = String(name || "").toLowerCase();

  // quick known mappings
  const MAP = [
    { match: /inter|system-ui|ui-sans|segoe|roboto|helvetica|arial/, name: "Inter", hrefs: [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
    ], isSerif: false },
    { match: /poppins|montserrat|manrope|nunito|dm sans|plus jakarta/, name: "Poppins", hrefs: [
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap"
    ], isSerif: false },
    { match: /circular|gt america|proxima|sohne|graphik|sf pro|avenir|gotham|futura/, name: "Inter", hrefs: [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"
    ], isSerif: false },
    { match: /playfair|cormorant|garamond|bodoni|didot|times|georgia|serif/, name: "Playfair Display", hrefs: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&display=swap"
    ], isSerif: true },
    { match: /quicksand|rubik|mulish|work sans|urbanist/, name: "Quicksand", hrefs: [
      "https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&display=swap"
    ], isSerif: false },
  ];
  for (const m of MAP) if (m.match.test(n)) return { name: m.name, hrefs: m.hrefs, isSerif: m.isSerif };

  // default to Inter stack
  return {
    name: "Inter",
    hrefs: ["https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"],
    isSerif: false
  };
}

function firstHex(...cands){ for(const c of cands.flat()){ const v=normHex(c); if(v) return v; } return null; }

// ---- scraping ----
async function fetchText(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await axios.get(url, { signal: ctrl.signal });
    return r.data || "";
  } catch { return ""; } finally { clearTimeout(t); }
}

async function scrapeSiteHints(siteUrl) {
  if (!siteUrl) return {};
  let url = siteUrl;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");

  const html = await fetchText(url);
  if (!html) return {};

  const $ = cheerio.load(html);
  const links = [
    ...new Set($('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get().filter(Boolean))
  ];
  const inlineStyles = $('style').map((_, el) => $(el).html() || "").get().join("\n");

  // fetch external CSS (best-effort)
  let cssBundle = inlineStyles;
  for (const href of links.slice(0, 6)) {
    try {
      const full = href.startsWith("http") ? href : new URL(href, url).toString();
      cssBundle += "\n\n/* ---- " + full + " ---- */\n" + (await fetchText(full, 6000));
    } catch {}
  }

  // very light parsing
  const fontFaces = Array.from(cssBundle.matchAll(/font-family\s*:\s*([^;{}]+)/gi)).map(m => m[1]);
  const varColors = Array.from(cssBundle.matchAll(/--[\w-]*color[\w-]*\s*:\s*([^;{}]+)/gi)).map(m => m[1]);
  const radii = Array.from(cssBundle.matchAll(/border-radius\s*:\s*([^;{}]+)/gi)).map(m => m[1]);
  const buttons = Array.from(cssBundle.matchAll(/\.btn[^{}]*\{[^}]*\}/gi)).map(m => m[0]);

  const guessFont = (arr) => (arr[0] || "").replace(/['"]/g, "").split(",")[0].trim();
  const headingFontGuess = guessFont(fontFaces.filter(s => /heading|h1|h2|title/i.test(s)));
  const bodyFontGuess = guessFont(fontFaces);

  const radNums = radii.map(r => {
    const m = String(r).match(/(\d+(\.\d+)?)px/);
    return m ? Number(m[1]) : null;
    }).filter(Number.isFinite);

  const radiusAvg = radNums.length ? Math.round(radNums.reduce((a,b)=>a+b,0)/radNums.length) : null;

  // friendly color guesses
  const hexes = Array.from(new Set(
    (varColors.join(" ") + " " + cssBundle)
      .match(/#[0-9a-f]{3,6}/gi) || []
  )).slice(0, 12);

  return {
    headingFontGuess, bodyFontGuess,
    radiusAvg,
    colorHexes: hexes
  };
}

// ---- LLM reconciliation (optional, but used if OPENAI key exists) ----
async function llmStyleCompletion(hints, payload) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sys = `
You output a compact JSON "email style manifest" for a brand.
Use safe defaults if missing. Respect brand identity, but keep accessibility (contrast >= 4.5 for normal text).
Only return JSON.
Schema:
{
  "fonts": {
    "heading": {"name": "","isSerif": false, "hrefs": []},
    "body": {"name": "","isSerif": false, "hrefs": []}
  },
  "palette": {
    "brand": "#000000",
    "brandAlt": "#000000",
    "pageBg": "#ffffff",
    "sectionBg": "#ffffff",
    "text": "#111111",
    "muted": "#6b7280",
    "border": "#e5e7eb"
  },
  "radii": {"card": 8, "img": 6, "btn": 6},
  "buttons": {"variant": "filled|outline|gradient|ghost", "caps": false, "letterSpacing": 0, "radius": 6},
  "spacing": {"cardPad": 24},
  "shadows": {"card": ""}
}`.trim();

    const user = `
BRAND PAYLOAD (truncated): ${JSON.stringify(payload).slice(0,1500)}
SCRAPE HINTS: ${JSON.stringify(hints)}
Return only JSON.
`.trim();

    const resp = await openai.chat.completions.create({
      model: process.env.STYLE_MODEL || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 500,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }]
    });

    const text = resp.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    try {
      const j = JSON.parse(text);
      return j;
    } catch { return null; }
  } catch { return null; }
}

// ---- normalization ----
function normalizePalette(p) {
  const brand = normHex(p?.brand) || "#6a5cff";
  const brandAlt = normHex(p?.brandAlt) || mix(brand, "#000000", 0.35);
  const pageBg = normHex(p?.pageBg) || "#ffffff";
  const sectionBg = normHex(p?.sectionBg) || pageBg;
  const text = normHex(p?.text) || bestTextOn(pageBg);
  const border = normHex(p?.border) || (contrastRatio(pageBg, "#000000") > 4 ? "#e5e7eb" : "#374151");
  const muted = normHex(p?.muted) || "#6b7280";
  return { brand, brandAlt, pageBg, sectionBg, text, muted, border };
}

function normalizeFonts(f) {
  // try to map provided names to email-safe stacks
  const h = mapFontToEmailSafe(f?.heading?.name || f?.heading || "");
  const b = mapFontToEmailSafe(f?.body?.name || f?.body || "");
  // prefer provided hrefs if appear to be google fonts
  const isGF = (href) => /fonts\.googleapis\.com/i.test(href);
  const safeHrefs = (arr=[]) => arr.filter(isGF).slice(0, 3);

  return {
    heading: {
      name: f?.heading?.name || h.name,
      isSerif: !!(f?.heading?.isSerif ?? h.isSerif),
      hrefs: safeHrefs(f?.heading?.hrefs || []).length ? safeHrefs(f?.heading?.hrefs || []) : h.hrefs
    },
    body: {
      name: f?.body?.name || b.name,
      isSerif: !!(f?.body?.isSerif ?? b.isSerif),
      hrefs: safeHrefs(f?.body?.hrefs || []).length ? safeHrefs(f?.body?.hrefs || []) : b.hrefs
    }
  };
}

function normalizeShape({ radii, buttons, spacing, shadows }) {
  const r = {
    card: Number.isFinite(radii?.card) ? radii.card : 8,
    img: Number.isFinite(radii?.img) ? radii.img : 6,
    btn: Number.isFinite(radii?.btn) ? radii.btn : (Number.isFinite(buttons?.radius) ? buttons.radius : 6)
  };
  const b = {
    variant: buttons?.variant || "filled",
    caps: !!buttons?.caps,
    letterSpacing: Number.isFinite(buttons?.letterSpacing) ? buttons.letterSpacing : 0
  };
  const sp = { cardPad: Number.isFinite(spacing?.cardPad) ? spacing.cardPad : 24 };
  const sh = { card: typeof shadows?.card === "string" ? shadows.card : "" };
  return { radii: r, buttons: b, spacing: sp, shadows: sh };
}

// ---- public API ----
export async function buildBrandStyleManifest(brandPayload = {}, siteUrl = "") {
  // scrape hints
  const hints = await scrapeSiteHints(siteUrl || brandPayload?.store_url || brandPayload?.domain || "");

  // naive palette guess from payload + hints
  const p = {
    brand: firstHex(
      brandPayload?.primary_color,
      brandPayload?.primaryColor,
      brandPayload?.link_color,
      brandPayload?.linkColor,
      (brandPayload?.colors || [])[0],
      (hints.colorHexes || [])[0]
    ),
    brandAlt:
      firstHex(
        brandPayload?.link_color,
        brandPayload?.linkColor,
        (brandPayload?.colors || [])[1],
        (hints.colorHexes || [])[1]
      ) || null,
    pageBg: firstHex(brandPayload?.page_bg, "#ffffff"),
    sectionBg: firstHex(brandPayload?.section_bg, brandPayload?.page_bg, "#ffffff"),
    text: null, muted: null, border: null
  };

  const fontsGuess = {
    heading: brandPayload?.fonts?.heading || {
      name: hints.headingFontGuess || brandPayload?.heading_font || "Inter"
    },
    body: brandPayload?.fonts?.body || {
      name: hints.bodyFontGuess || brandPayload?.body_font || "Inter"
    }
  };

  // call LLM to reconcile (if key set)
  const llm = await llmStyleCompletion(
    {
      colors: hints.colorHexes,
      radiusAvg: hints.radiusAvg,
      headingFontGuess: fontsGuess.heading,
      bodyFontGuess: fontsGuess.body
    },
    {
      store_name: brandPayload?.store_name,
      domain: brandPayload?.domain || brandPayload?.store_url,
      colors: brandPayload?.colors,
      primary_color: brandPayload?.primary_color,
      link_color: brandPayload?.link_color
    }
  );

  // compose final manifest
  const palette = normalizePalette(llm?.palette || p);
  const fonts = normalizeFonts(llm?.fonts || fontsGuess);
  const shape = normalizeShape({
    radii: llm?.radii || (hints.radiusAvg ? { card: hints.radiusAvg, img: Math.max(4, Math.round(hints.radiusAvg*0.75)) } : {}),
    buttons: llm?.buttons || {},
    spacing: llm?.spacing || {},
    shadows: llm?.shadows || {}
  });

  return {
    fonts,
    palette,
    radii: shape.radii,
    buttons: shape.buttons,
    spacing: shape.spacing,
    shadows: shape.shadows
  };
}

export default { buildBrandStyleManifest, mapFontToEmailSafe };
