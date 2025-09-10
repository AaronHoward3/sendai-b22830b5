// src/theme/applyTheme.js
// Deterministic theming with wrapper-only gradient for gradient skin:
// - head injection
// - body wrapper gradient via data-URI (no url(...))
// - sections transparent under gradient (no bg-color / bg-url)
// - bold_contrasting slabs kept for that skin only
// - auto-contrast for text/buttons

import { buildBrandTokens, contrastRatio } from "./tokens.js";
import { makeSkin } from "./skins.js";

function attrs(obj) { return Object.entries(obj).map(([k, v]) => `${k}="${String(v)}"`).join(" "); }
function stripAttr(tag, patterns) { let out = tag; for (const p of patterns) out = out.replace(p, ""); return out; }
function addOrReplaceAttr(tag, name, value) {
  const re = new RegExp(`\\s${name}="[^"]*"`, "i");
  if (re.test(tag)) return tag.replace(re, ` ${name}="${value}"`);
  return tag.replace(/<([a-z-]+)/i, (m) => `${m} ${name}="${value}"`);
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
function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padStart(6, "0");
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function _lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function _L(hex) { const { r, g, b } = hexToRgb(hex); return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b); }
function contrast(bg, fg) { const a = _L(bg), b = _L(fg); const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); }
function bestTextOn(bg) { return contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111"; }

// SVG data-URI gradient (NO url(...) wrapper). MJML expects raw string in background-url.
function svgGradientDataUri(angleDeg, c1, c2) {
  // Convert angle to SVG gradient coordinates
  const ang = (Number(angleDeg) || 0) % 360;
  const rad = (ang - 90) * Math.PI / 180;
  const x = Math.cos(rad), y = Math.sin(rad);
  const x1 = (0.5 - x / 2).toFixed(3), y1 = (0.5 - y / 2).toFixed(3);
  const x2 = (0.5 + x / 2).toFixed(3), y2 = (0.5 + y / 2).toFixed(3);

  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <defs>
        <linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect fill="url(#g)" x="0" y="0" width="1200" height="800" />
    </svg>`
  );
  return `data:image/svg+xml;utf8,${svg}`;
}

function buildHead(skin) {
  const H = skin.fonts.heading, B = skin.fonts.body;
  const serifFallback = `Georgia, 'Times New Roman', Times, serif`;
  const sansFallback  = `system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  const fontTags = []
    .concat((H?.hrefs || []).map(h => `<mj-font name="${H.name}" href="${h}"></mj-font>`))
    .concat((B?.hrefs || []).map(h => `<mj-font name="${B.name}" href="${h}"></mj-font>`))
    .join("\n      ");

  const buttonBase = {
    "inner-padding": skin.buttons?.pad || "14px 22px",
    "font-weight": "700",
    "text-decoration": "none",
    "border-radius": `${skin.radii.btn}px`
  };

  // Button variants + caps/letter-spacing + optional card shadow
  let btnCss = "";
  if (skin.buttons.variant === "filled") {
    btnCss = `.btn a{background-color:${skin.palette.brand};color:#ffffff;border:0;}`;
  } else if (skin.buttons.variant === "outline") {
    btnCss = `.btn a{background-color:transparent;color:${skin.palette.text};border:${skin.border.width}px ${skin.border.style} ${skin.palette.border};}`;
  } else if (skin.buttons.variant === "ghost") {
    btnCss = `.btn a{background-color:transparent;color:${skin.palette.brand};border:0;}`;
  } else if (skin.buttons.variant === "gradient") {
    btnCss = `.btn a{background-image:linear-gradient(90deg, ${skin.palette.brand}, ${skin.palette.brandAlt});color:#ffffff;border:0;}`;
  }
  const capsCss = `.btn a{text-transform:${skin.buttons?.caps ? "uppercase" : "none"};letter-spacing:${(skin.buttons?.letterSpacing ?? 0)}em;}`;

  const css =
    `a{color:${skin.palette.brand};}a:hover{color:${skin.palette.brandAlt};}` +
    `.btn-secondary a{background-color:${skin.palette.brandAlt};color:#ffffff;border:0;}` +
    `${btnCss}${capsCss}` +
    (skin.shadow?.card ? `.card{box-shadow:${skin.shadow.card};}` : "");

  const cardAttrs = {
    "background-color": skin.palette.cardBg,
    "padding": `${skin.space?.cardPad ?? 24}px`,
    "border-radius": `${skin.radii.card}px`,
    "css-class": "card"
  };

  return `
  <mj-head>
    ${fontTags}
    <mj-attributes>
      <mj-all font-family="${B?.name || "Inter"}, ${(B?.isSerif ? serifFallback : sansFallback)}"></mj-all>
      <mj-text color="${skin.palette.text}" font-size="${skin.bodySize}px" line-height="1.6" font-weight="400"></mj-text>
      <mj-button ${attrs(buttonBase)} font-family="${B?.name || "Inter"}, ${(B?.isSerif ? serifFallback : sansFallback)}" mj-class="btn"></mj-button>
      <mj-image border-radius="${skin.radii.img}px" padding="0" width="${(skin.img?.width ?? 520)}px"></mj-image>
      <mj-divider border-color="${skin.palette.border}" border-width="${skin.border.width}px" border-style="${skin.border.style}"></mj-divider>
      <mj-class name="h1" font-family="${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)}" font-weight="${skin.h1.weight}" font-size="${skin.h1.size}px" line-height="1.2" text-transform="${skin.typography?.capsHeadings ? "uppercase" : "none"}" letter-spacing="${(skin.typography?.h1LS ?? 0)}em" color="${skin.palette.text}"></mj-class>
      <mj-class name="h2" font-family="${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)}" font-weight="${skin.h2.weight}" font-size="${skin.h2.size}px" line-height="1.3" text-transform="${skin.typography?.capsHeadings ? "uppercase" : "none"}" letter-spacing="${(skin.typography?.h2LS ?? 0)}em" color="${skin.palette.text}"></mj-class>

      <!-- Thick title helpers (used esp. by bold_contrasting) -->
      <mj-class name="title" font-family="${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)}" font-weight="900" font-size="${skin.id === 'gradient_glow' ? Math.max(36, skin.h1.size) : Math.max(24, skin.h2.size)}px" line-height="1.2" color="${skin.palette.text}" letter-spacing="${skin.id === 'gradient_glow' ? '-0.02em' : '0em'}"></mj-class>
      <mj-class name="product-title" font-family="${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)}" font-weight="900" font-size="${skin.id === 'gradient_glow' ? Math.max(28, skin.h2.size) : Math.max(20, Math.round(skin.h2.size * 0.9))}px" line-height="1.25" color="${skin.palette.text}" letter-spacing="${skin.id === 'gradient_glow' ? '-0.01em' : '0em'}"></mj-class>
      <mj-class name="no-pad" padding="0"></mj-class>

      <mj-class name="muted" color="${skin.palette.muted}"></mj-class>
      <mj-class name="btn"></mj-class>
      <mj-class name="btn-secondary"></mj-class>
      <mj-class name="img" padding="0" border-radius="${skin.radii.img}px"></mj-class>
      <mj-class name="card" ${attrs(cardAttrs)}></mj-class>
    </mj-attributes>
    <mj-style>${css}</mj-style>
  </mj-head>`.trim();
}

// Public API
// mjml: string MJML source
// payloadBrand: object with brand colors (primary/link/etc.)
// skinIdRaw: string skin id or alias (e.g., "bold_contrasting", "gradient_glow", "pastel_soft"...)
export function applyTheme(mjml, payloadBrand, skinIdRaw) {
  const tokens = buildBrandTokens(payloadBrand);
  const skin = makeSkin(tokens, skinIdRaw);

  // 0) Replace any existing head with our head
  let out = String(mjml || "");
  console.log("🔍 [DEBUG] applyTheme input MJML:", {
    hasMjml: out.includes("<mjml>"),
    hasMjBody: out.includes("<mj-body>"),
    hasMjBodyClose: out.includes("</mj-body>"),
    length: out.length,
    preview: out.substring(0, 200)
  });
  
  out = out.replace(/<mj-head[\s\S]*?<\/mj-head>/gi, "");
  const head = buildHead(skin);
  out = out.includes("<mjml>") ? out.replace("<mjml>", `<mjml>\n${head}\n`) : `<mjml>\n${head}\n${out}`;

  // 1) Body background + optional gradient wrapper (SVG data-URI, no url(...))
  const gradientActive = !!(skin.pattern && skin.pattern.kind === "linear" && skin.extras.globalGradient);
  const g1 = skin.pattern?.grad1 || tokens.gradient.from;
  const g2 = skin.pattern?.grad2 || tokens.gradient.to;
  const ang = skin.pattern?.angle ?? tokens.gradient.angle;
  const gradMid = mix(g1, g2, 0.5);

  const bodyRe = /<mj-body\b[^>]*>/i;
  const hasBody = bodyRe.test(out);
  const bodyTag = hasBody ? out.match(bodyRe)[0] : "<mj-body>";

  let newBody = bodyTag;

  // Always set base background-color
  newBody = addOrReplaceAttr(newBody, "background-color", tokens.pageBg);

  // If gradient skin, set a global background using CSS gradient
  if (gradientActive) {
    // Use CSS gradient for better MJML compatibility
    const cssGradient = `linear-gradient(${ang}deg, ${g1}, ${g2})`;
    
    // Add CSS gradient to the style section
    const gradientCss = `.gradient-bg { background: ${cssGradient} !important; }`;
    
    // Insert gradient CSS into the existing style tag
    out = out.replace(
      /(<mj-style>)([\s\S]*?)(<\/mj-style>)/i,
      `$1$2${gradientCss}$3`
    );
    
    // Set the body to use the gradient class
    newBody = addOrReplaceAttr(newBody, "css-class", "gradient-bg");
  } else {
    // No gradient: ensure clean base
    newBody = newBody.replace(/\sbackground-url="[^"]*"/i, "");
  }

  out = hasBody ? out.replace(bodyTag, newBody) : `<mjml>\n${newBody}\n${out.replace(/^<mjml>\s*/i, "")}\n</mj-body>\n</mjml>`;

  console.log("🔍 [DEBUG] applyTheme after body processing:", {
    hasMjml: out.includes("<mjml>"),
    hasMjBody: out.includes("<mj-body>"),
    hasMjBodyClose: out.includes("</mj-body>"),
    length: out.length,
    preview: out.substring(0, 200)
  });

  // 2) Section processing
  out = out.replace(/<mj-section\b[^>]*>[\s\S]*?<\/mj-section>/gi, (section) => {
    let s = section;

    // When gradient is active: make sections fully transparent—no bg-color, no bg-url.
    if (gradientActive) {
      s = s
        .replace(/(<mj-section\b[^>]*?)\s+background-color="[^"]*"/gi, "$1")
        .replace(/(<mj-section\b[^>]*?)\s+background-url="[^"]*"/gi, "$1");
      
      // Explicitly set sections to be transparent when gradient is active
      if (!/\sbackground-color="[^"]*"/i.test(s)) {
        s = s.replace(/<mj-section\b/i, `<mj-section background-color="transparent"`);
      }
    }
    // Bold-contrasting slabs (only when NOT gradient)
    else if (skin.extras.slabMode === "dark") {
      const hasBgColor = /\sbackground-color="[^"]*"/i.test(s);
      const hasBgUrl = /\sbackground-url="[^"]*"/i.test(s);
      if (!hasBgColor && !hasBgUrl) {
        const slab = skin.extras.slabColor || "#111111";
        s = s.replace(/<mj-section\b/i, `<mj-section background-color="${slab}"`);
      }
    }
    // Default: ensure section background exists if none (but NOT when gradient is active)
    else if (!gradientActive) {
      const hasBgColor = /\sbackground-color="[^"]*"/i.test(s);
      const hasBgUrl = /\sbackground-url="[^"]*"/i.test(s);
      if (!hasBgColor && !hasBgUrl) {
        s = s.replace(/<mj-section\b/i, `<mj-section background-color="${skin.palette.sectionBg}"`);
      }
    }

    // Compute bg for text contrast logic
    const bgMatch = s.match(/\sbackground-color="([^"]*)"/i);
    const bg = (bgMatch && bgMatch[1]) || (gradientActive ? gradMid : skin.palette.sectionBg);

    // TEXT: normalize color for contrast if colorOverrides enabled
    if (skin.extras.colorOverrides) {
      s = s.replace(/<mj-text\b([^>]*)>/gi, (m, attrsStr) => {
        const hasColorMatch = /\scolor="/i.test(attrsStr);
        const cur = (attrsStr.match(/\scolor="([^"]*)"/i) || [])[1] || skin.palette.text;
        const desired = (cur && contrast(bg, cur) >= 4.5) ? cur : bestTextOn(bg);
        let t = m;
        if (hasColorMatch) t = t.replace(/\scolor="[^"]*"/i, ` color="${desired}"`);
        else t = `<mj-text${attrsStr} color="${desired}">`;
        return t;
      });
    }

    // BUTTONS: ensure class + let head CSS handle look; for filled/gradient we still ensure good contrast when overriding
    s = s.replace(/<mj-button\b[^>]*>/gi, (tag) => {
      let t = tag;
      if (!/mj-class=/i.test(t)) t = t.replace(/<mj-button/i, `<mj-button mj-class="btn"`);
      if (skin.extras.colorOverrides) {
        const txt = bestTextOn(bg);
        if (skin.buttons.variant === "filled" || skin.buttons.variant === "gradient") {
          // choose the stronger of brand/brandAlt vs current section bg
          const bgBtn = contrast(bg, skin.palette.brand) >= contrast(bg, skin.palette.brandAlt) ? skin.palette.brand : skin.palette.brandAlt;
          t = addOrReplaceAttr(t, "background-color", bgBtn);
          t = addOrReplaceAttr(t, "color", txt);
          t = addOrReplaceAttr(t, "border", "0");
        } else if (skin.buttons.variant === "outline") {
          t = addOrReplaceAttr(t, "background-color", "transparent");
          t = addOrReplaceAttr(t, "color", txt);
          t = addOrReplaceAttr(t, "border", `1px solid ${txt}`);
        } else {
          t = addOrReplaceAttr(t, "background-color", "transparent");
          t = addOrReplaceAttr(t, "color", skin.palette.brand);
          t = addOrReplaceAttr(t, "border", "0");
        }
      }
      return t;
    });

    return s;
  });

   // --- Bold Contrasting: force hero title thick + zero image padding everywhere ---
  if (skin.id === "bold_contrasting") {
    // A) First hero title: make it thick & large automatically.
    // Try <mj-hero> first; if not present, apply to first <mj-section>.
    const thickenFirstText = (sec) => {
      let applied = false;
      const outSec = sec.replace(/<mj-text\b([^>]*)>/i, (m, attrs) => {
        applied = true;
        let t = m;
        // ensure it gets our title class
        if (!/mj-class="/i.test(t)) t = t.replace(/<mj-text/i, `<mj-text mj-class="title"`);
        else t = t.replace(/mj-class="([^"]*)"/i, (mm, val) => `mj-class="${val} title"`);
        // hard enforce size/weight in case inline attrs exist
        t = addOrReplaceAttr(t, "font-weight", "900");
        t = addOrReplaceAttr(t, "font-size", `${skin.h1.size}px`);
        return t;
      });
      return applied ? outSec : sec;
    };

    // Try <mj-hero> block
    let replaced = false;
    const nextOut = out.replace(/<mj-hero\b[^>]*>[\s\S]*?<\/mj-hero>/i, (blk) => {
      replaced = true;
      return thickenFirstText(blk);
    });
    out = nextOut;

    // If no <mj-hero>, apply to the very first <mj-section>
    if (!replaced) {
      out = out.replace(/<mj-section\b[^>]*>[\s\S]*?<\/mj-section>/i, (sec) => thickenFirstText(sec));
    }

    // B) Strip padding from all images to keep visuals tight
    out = out.replace(/<mj-image\b[^>]*>/gi, (tag) => addOrReplaceAttr(tag, "padding", "0"));
  }
  
  // 3) Color overrides: swap hardcoded colors to brand tones or black/white for luxe_mono
  if (skin.extras.colorOverrides) {
    let swaps = [];
    
    if (skin.id === "luxe_mono") {
      // Luxe mono: force everything to black and white
      swaps = [
        // Convert any color to black
        { re: /color="#[0-9a-fA-F]{6}"/gi, repl: `color="${skin.palette.text}"` },
        { re: /color="#[0-9a-fA-F]{3}"/gi, repl: `color="${skin.palette.text}"` },
        // Convert any background-color to white or black based on context
        { re: /background-color="#[0-9a-fA-F]{6}"/gi, repl: `background-color="${skin.palette.pageBg}"` },
        { re: /background-color="#[0-9a-fA-F]{3}"/gi, repl: `background-color="${skin.palette.pageBg}"` },
        // Convert borders to black
        { re: /border-color="#[0-9a-fA-F]{6}"/gi, repl: `border-color="${skin.palette.border}"` },
        { re: /border-color="#[0-9a-fA-F]{3}"/gi, repl: `border-color="${skin.palette.border}"` }
      ];
    } else {
      // Other skins: swap common hardcoded colors to brand tones
      swaps = [
        { re: /color="#ffd700"/gi, repl: `color="${skin.palette.brand}"` },
        { re: /color="#ffb400"/gi, repl: `color="${skin.palette.brand}"` },
        { re: /color="#ff4d4d"/gi, repl: `color="${skin.palette.brandAlt}"` },
        { re: /background-color="#ffd700"/gi, repl: `background-color="${skin.palette.brand}"` },
        { re: /background-color="#ffb400"/gi, repl: `background-color="${skin.palette.brand}"` },
        { re: /background-color="#ff4d4d"/gi, repl: `background-color="${skin.palette.brandAlt}"` }
      ];
    }
    
    for (const { re, repl } of swaps) out = out.replace(re, repl);
  }

  return out;
}
