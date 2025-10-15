// src/theme/applyTheme.js
// Brand-first theming with optional gradient wrapper.
// Skins no longer hard-overwrite fonts/colors; they inherit from tokens (brand-first).

import { buildBrandTokens, contrastRatio } from "./tokens.js";
import { makeSkin } from "./skins.js";

function attrs(obj) { return Object.entries(obj).map(([k, v]) => `${k}="${String(v)}"`).join(" "); }
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
function bestTextOn(bg) {
  const whiteContrast = contrast(bg, "#ffffff");
  const blackContrast = contrast(bg, "#111111");
  if (whiteContrast >= 4.5 && blackContrast >= 4.5) return whiteContrast >= blackContrast ? "#ffffff" : "#111111";
  if (whiteContrast >= 4.5) return "#ffffff";
  if (blackContrast >= 4.5) return "#111111";
  return whiteContrast >= blackContrast ? "#ffffff" : "#111111";
}

// Map Google Fonts to web-safe email equivalents
function mapFontToEmailSafe(fontName) {
  const fontMap = {
    // Sans-serif fonts
    'Poppins': 'Arial, Helvetica, sans-serif',
    'Inter': 'Arial, Helvetica, sans-serif',
    'Roboto': 'Arial, Helvetica, sans-serif',
    'Open Sans': 'Arial, Helvetica, sans-serif',
    'Lato': 'Arial, Helvetica, sans-serif',
    'Montserrat': 'Arial, Helvetica, sans-serif',
    'Nunito': 'Arial, Helvetica, sans-serif',
    'Source Sans Pro': 'Arial, Helvetica, sans-serif',
    'Ubuntu': 'Arial, Helvetica, sans-serif',
    'Raleway': 'Arial, Helvetica, sans-serif',
    'PT Sans': 'Arial, Helvetica, sans-serif',
    'Work Sans': 'Arial, Helvetica, sans-serif',
    'Fira Sans': 'Arial, Helvetica, sans-serif',
    'Noto Sans': 'Arial, Helvetica, sans-serif',
    'Dosis': 'Arial, Helvetica, sans-serif',
    'Oswald': 'Arial, Helvetica, sans-serif',
    'Playfair Display': 'Georgia, Times New Roman, serif',
    'Merriweather': 'Georgia, Times New Roman, serif',
    'Lora': 'Georgia, Times New Roman, serif',
    'Crimson Text': 'Georgia, Times New Roman, serif',
    'Libre Baskerville': 'Georgia, Times New Roman, serif',
    'PT Serif': 'Georgia, Times New Roman, serif',
    'Source Serif Pro': 'Georgia, Times New Roman, serif',
    'Cormorant Garamond': 'Georgia, Times New Roman, serif',
    'Playfair Display SC': 'Georgia, Times New Roman, serif'
  };
  
  return fontMap[fontName] || 'Arial, Helvetica, sans-serif';
}

function buildHead(skin) {
  const H = skin.fonts.heading, B = skin.fonts.body;
  // Use web-safe fonts that work in email clients
  const serifFallback = `Georgia, 'Times New Roman', Times, serif`;
  const sansFallback = `Arial, Helvetica, sans-serif`;
  
  // Map detected fonts to email-safe equivalents
  const headingFont = mapFontToEmailSafe(H?.name || 'Inter');
  const bodyFont = mapFontToEmailSafe(B?.name || 'Inter');
  
  console.log(`🎨 [FONT MAPPING] Detected heading font: "${H?.name}" -> Email-safe: "${headingFont}"`);
  console.log(`🎨 [FONT MAPPING] Detected body font: "${B?.name}" -> Email-safe: "${bodyFont}"`);
  console.log(`🔘 [BUTTON STYLES] Skin: ${skin.id}, Border radius: ${skin.radii.btn}px, Variant: ${skin.buttons?.variant}, Padding: ${skin.buttons?.pad}`);

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

  // button CSS variants
  let btnCss = "";
  if (skin.buttons.variant === "filled") {
    btnCss = `.btn a{background-color:${skin.palette.brand};color:#ffffff;border:0;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.1);}` +
             `.btn a:hover{background-color:${skin.palette.brandAlt};transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15);}`;
  } else if (skin.buttons.variant === "outline") {
    btnCss = `.btn a{background-color:transparent;color:${skin.palette.brand};border:2px solid ${skin.palette.brand};transition:all 0.2s ease;}` +
             `.btn a:hover{background-color:${skin.palette.brand};color:#ffffff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.1);}`;
  } else if (skin.buttons.variant === "ghost") {
    btnCss = `.btn a{background-color:transparent;color:${skin.palette.brand};border:0;transition:all 0.2s ease;}` +
             `.btn a:hover{background-color:${skin.palette.brand};color:#ffffff;transform:translateY(-1px);}`;
  } else if (skin.buttons.variant === "gradient") {
    btnCss = `.btn a{background-image:linear-gradient(135deg, ${skin.palette.brand}, ${skin.palette.brandAlt});color:#ffffff;border:0;transition:all 0.2s ease;box-shadow:0 4px 15px rgba(0,0,0,0.2);}` +
             `.btn a:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.3);}`;
  }
  const capsCss = `.btn a{text-transform:${skin.buttons?.caps ? "uppercase" : "none"};letter-spacing:${(skin.buttons?.letterSpacing ?? 0)}em;font-weight:600;}`;

  const css =
    `a{color:${skin.palette.brand};transition:color 0.2s ease;}a:hover{color:${skin.palette.brandAlt};}` +
    `.btn-secondary a{background-color:${skin.palette.brandAlt};color:#ffffff;border:0;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.1);}` +
    `.btn-secondary a:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15);}` +
    `${btnCss}${capsCss}` +
    (skin.shadow?.card ? `.card{box-shadow:${skin.shadow.card};transition:box-shadow 0.2s ease;}` : "") +
    `.card:hover{box-shadow:${skin.shadow?.card ? skin.shadow.card.replace('0.08', '0.12').replace('0.04', '0.08') : '0 4px 20px rgba(0,0,0,0.1)'};}` +
    `.hero-title{font-family:${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)} !important;}` +
    `.hero-subtitle{font-family:${B?.name || "Inter"}, ${(B?.isSerif ? serifFallback : sansFallback)} !important;}` +
    `.btn a{font-family:${H?.name || "Inter"}, ${(H?.isSerif ? serifFallback : sansFallback)} !important;}` +
    `.product-title{word-break:normal !important;white-space:normal !important;hyphens:auto !important;}` +
    `.product-desc{word-break:normal !important;white-space:normal !important;hyphens:auto !important;}`;

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
      <!-- mj-all removed to allow individual font classes to work properly -->
      <mj-text color="${skin.palette.text}" font-size="${skin.bodySize}px" line-height="1.6" font-weight="400" font-family="${bodyFont}"></mj-text>
      <mj-button ${attrs(buttonBase)} font-family="${headingFont}" mj-class="btn"></mj-button>
      <mj-image border-radius="${skin.radii.img}px" padding="${skin.img?.padding ?? 0}" width="${(skin.img?.width ?? 520)}px"></mj-image>
      <mj-divider border-color="${skin.palette.border}" border-width="${skin.border.width}px" border-style="${skin.border.style}"></mj-divider>
      <mj-class name="h1" font-family="${headingFont}" font-weight="${skin.h1.weight}" font-size="${skin.h1.size}px" line-height="${skin.typography?.lineHeight || 1.4}" text-transform="${skin.typography?.capsHeadings ? "uppercase" : "none"}" letter-spacing="${(skin.typography?.h1LS ?? 0)}em" color="${skin.palette.text}" word-break="normal" white-space="normal"></mj-class>
      <mj-class name="h2" font-family="${headingFont}" font-weight="${skin.h2.weight}" font-size="${skin.h2.size}px" line-height="${skin.typography?.lineHeight || 1.5}" text-transform="${skin.typography?.capsHeadings ? "uppercase" : "none"}" letter-spacing="${(skin.typography?.h2LS ?? 0)}em" color="${skin.palette.text}" word-break="normal" white-space="normal"></mj-class>
      <mj-class name="h3" font-family="${headingFont}" font-weight="${skin.h3?.weight || 600}" font-size="${skin.h3?.size || Math.round(skin.h2.size * 0.85)}px" line-height="${skin.typography?.lineHeight || 1.4}" text-transform="${skin.typography?.capsHeadings ? "uppercase" : "none"}" letter-spacing="${(skin.typography?.h3LS ?? 0)}em" color="${skin.palette.text}"></mj-class>
      <mj-class name="body" font-family="${bodyFont}" font-weight="400" font-size="${skin.bodySize}px" line-height="${skin.typography?.lineHeight || 1.6}" color="${skin.palette.text}"></mj-class>

      <mj-class name="title" font-family="${headingFont}" font-weight="${skin.id === 'magazine_serif' ? '500' : '900'}" font-size="${Math.max(36, skin.h1.size)}px" line-height="1.2" color="${skin.palette.text}" letter-spacing="0em"></mj-class>
      <mj-class name="product-title" font-family="${headingFont}" font-weight="${skin.id === 'magazine_serif' ? '400' : '900'}" font-size="${Math.max(20, Math.round(skin.h2.size * 0.9))}px" line-height="${skin.typography?.lineHeight || 1.3}" color="${skin.palette.text}" letter-spacing="${skin.typography?.h2LS ?? 0}em" word-break="normal" white-space="normal"></mj-class>
      <mj-class name="product-desc" font-family="${bodyFont}" font-weight="400" font-size="${Math.max(14, Math.round(skin.bodySize * 0.85))}px" line-height="${skin.typography?.lineHeight || 1.4}" color="${skin.palette.muted}" word-break="normal" white-space="normal"></mj-class>
      <mj-class name="product-price" font-family="${bodyFont}" font-weight="600" font-size="${Math.max(16, Math.round(skin.bodySize * 1.1))}px" line-height="1.4" color="${skin.palette.text}"></mj-class>
      <mj-class name="no-pad" padding="0"></mj-class>

      <mj-class name="muted" color="${skin.palette.muted}"></mj-class>
      <mj-class name="btn"></mj-class>
      <mj-class name="btn-secondary"></mj-class>
      <mj-class name="img" padding="${skin.img?.padding ?? 0}" border-radius="${skin.radii.img}px"></mj-class>
      <mj-class name="card" ${attrs(cardAttrs)}></mj-class>
    </mj-attributes>
    <mj-style>${css}</mj-style>
  </mj-head>`.trim();
}

// Public API
export function applyTheme(mjml, payloadBrand, skinIdRaw) {
  const tokens = buildBrandTokens(payloadBrand);
  const skin = makeSkin(tokens, skinIdRaw, payloadBrand._styleManifest);

  let out = String(mjml || "");
  out = out.replace(/<mj-head[\s\S]*?<\/mj-head>/gi, "");
  const head = buildHead(skin);
  out = out.includes("<mjml>") ? out.replace("<mjml>", `<mjml>\n${head}\n`) : `<mjml>\n${head}\n${out}`;

  // Body background + optional gradient wrapper
  const gradientActive = !!(skin.pattern && skin.pattern.kind === "linear" && skin.extras.globalGradient);
  const g1 = skin.pattern?.grad1 || tokens.gradient.from;
  const g2 = skin.pattern?.grad2 || tokens.gradient.to;
  const ang = skin.pattern?.angle ?? tokens.gradient.angle;
  const gradMid = mix(g1, g2, 0.5);

  const bodyRe = /<mj-body\b[^>]*>/i;
  const hasBody = bodyRe.test(out);
  const bodyTag = hasBody ? out.match(bodyRe)[0] : "<mj-body>";

  let newBody = bodyTag;
  newBody = addOrReplaceAttr(newBody, "background-color", tokens.pageBg);

  if (gradientActive) {
    const cssGradient = `linear-gradient(${ang}deg, ${g1}, ${g2})`;
    const gradientCss = `.gradient-bg { background: ${cssGradient} !important; }`;
    out = out.replace(/(<mj-style>)([\s\S]*?)(<\/mj-style>)/i, `$1$2${gradientCss}$3`);
    newBody = addOrReplaceAttr(newBody, "css-class", "gradient-bg");
  } else {
    newBody = newBody.replace(/\sbackground-url="[^"]*"/i, "");
  }

  out = hasBody ? out.replace(bodyTag, newBody) : `<mjml>\n${newBody}\n${out.replace(/^<mjml>\s*/i, "")}\n</mj-body>\n</mjml>`;

  // Section normalization (contrast-aware)
  out = out.replace(/<mj-section\b[^>]*>[\s\S]*?<\/mj-section>/gi, (section) => {
    let s = section;

    if (gradientActive) {
      s = s
        .replace(/(<mj-section\b[^>]*?)\s+background-color="[^"]*"/gi, "$1")
        .replace(/(<mj-section\b[^>]*?)\s+background-url="[^"]*"/gi, "$1");
      if (!/\sbackground-color="[^"]*"/i.test(s)) {
        s = s.replace(/<mj-section\b/i, `<mj-section background-color="transparent"`);
      }
    } else {
      const hasBgColor = /\sbackground-color="[^"]*"/i.test(s);
      const hasBgUrl = /\sbackground-url="[^"]*"/i.test(s);
      if (!hasBgColor && !hasBgUrl) {
        s = s.replace(/<mj-section\b/i, `<mj-section background-color="${skin.palette.sectionBg}"`);
      }
    }

    const bgMatch = s.match(/\sbackground-color="([^"]*)"/i);
    const bg = (bgMatch && bgMatch[1]) || (gradientActive ? gradMid : skin.palette.sectionBg);

    // text contrast normalize
    s = s.replace(/<mj-text\b([^>]*)>/gi, (m, attrsStr) => {
      const hasColorMatch = /\scolor="/i.test(attrsStr);
      const cur = (attrsStr.match(/\scolor="([^"]*)"/i) || [])[1] || skin.palette.text;
      const desired = contrast(bg, cur) >= 4.5 ? cur : bestTextOn(bg);
      let t = m;
      if (hasColorMatch) t = t.replace(/\scolor="[^"]*"/i, ` color="${desired}"`);
      else t = `<mj-text${attrsStr} color="${desired}">`;
      return t;
    });

    // buttons
    s = s.replace(/<mj-button\b[^>]*>/gi, (tag) => {
      let t = tag;
      if (!/mj-class=/i.test(t)) t = t.replace(/<mj-button/i, `<mj-button mj-class="btn"`);
      
      // Always ensure border radius is applied from skin
      t = addOrReplaceAttr(t, "border-radius", `${skin.radii.btn}px`);
      
      if (skin.buttons.variant === "filled" || skin.buttons.variant === "gradient") {
        const brandContrast = contrast(bg, skin.palette.brand);
        const brandAltContrast = contrast(bg, skin.palette.brandAlt);
        const bgBtn = brandContrast >= brandAltContrast ? skin.palette.brand : skin.palette.brandAlt;
        const txt = bestTextOn(bgBtn);
        t = addOrReplaceAttr(t, "background-color", bgBtn);
        t = addOrReplaceAttr(t, "color", txt);
        t = addOrReplaceAttr(t, "border", "0");
      } else if (skin.buttons.variant === "outline") {
        const txt = bestTextOn(bg);
        t = addOrReplaceAttr(t, "background-color", "transparent");
        t = addOrReplaceAttr(t, "color", txt);
        t = addOrReplaceAttr(t, "border", `1px solid ${txt}`);
      } else {
        const brandContrast = contrast(bg, skin.palette.brand);
        const txt = brandContrast >= 4.5 ? skin.palette.brand : bestTextOn(bg);
        t = addOrReplaceAttr(t, "background-color", "transparent");
        t = addOrReplaceAttr(t, "color", txt);
        t = addOrReplaceAttr(t, "border", "0");
      }
      return t;
    });

    return s;
  });

  // Bold contrasting tweak: thicken first title + strip image padding + improve text spacing
  if (skin.id === "bold_contrasting") {
    let replaced = false;
    const nextOut = out.replace(/<mj-hero\b[^>]*>[\s\S]*?<\/mj-hero>/i, (blk) => {
      replaced = true;
      return blk.replace(/<mj-text\b([^>]*)>/i, (m, attrs) => {
        let t = m;
        if (!/mj-class="/i.test(t)) t = t.replace(/<mj-text/i, `<mj-text mj-class="title"`);
        else t = t.replace(/mj-class="([^"]*)"/i, (mm, val) => `mj-class="${val} title"`);
        t = addOrReplaceAttr(t, "font-weight", "900");
        // Ensure adequate padding to prevent text squishing
        if (!/padding=/i.test(t)) {
          t = addOrReplaceAttr(t, "padding", "30px 25px");
        }
        return t;
      });
    });
    out = nextOut;
    if (!replaced) {
      out = out.replace(/<mj-section\b[^>]*>[\s\S]*?<\/mj-section>/i, (sec) =>
        sec.replace(/<mj-text\b([^>]*)>/i, (m, attrs) => {
          let t = m;
          if (!/mj-class="/i.test(t)) t = t.replace(/<mj-text/i, `<mj-text mj-class="title"`);
          else t = t.replace(/mj-class="([^"]*)"/i, (mm, val) => `mj-class="${val} title"`);
          t = addOrReplaceAttr(t, "font-weight", "900");
          // Ensure adequate padding to prevent text squishing
          if (!/padding=/i.test(t)) {
            t = addOrReplaceAttr(t, "padding", "30px 25px");
          }
          return t;
        })
      );
    }
    out = out.replace(/<mj-image\b[^>]*>/gi, (tag) => addOrReplaceAttr(tag, "padding", "0"));
  }

  // Add divider lines between sections for serif, editorial, and bold contrasting skins
  if (skin.id === "magazine_serif" || skin.id === "warm_editorial" || skin.id === "bold_contrasting") {
    let dividerWidth, dividerColor;
    
    if (skin.id === "magazine_serif") {
      dividerWidth = "1px";
      dividerColor = skin.palette.border || "#e5e7eb";
    } else if (skin.id === "warm_editorial") {
      dividerWidth = "4px";
      dividerColor = skin.palette.border || "#e5e7eb";
    } else if (skin.id === "bold_contrasting") {
      dividerWidth = "2px";
      dividerColor = skin.palette.brand || "#ffffff"; // Use brand color for bold contrasting
    }
    
    // Add dividers between sections (but not before the first section)
    out = out.replace(/(<\/mj-section>)(\s*<mj-section)/gi, (match, sectionEnd, nextSection) => {
      // For bold contrasting, add dark background to divider section
      const dividerSectionBg = skin.id === "bold_contrasting" ? ` background-color="${skin.palette.sectionBg}"` : "";
      
      return sectionEnd + `
  <mj-section padding="20px 0"${dividerSectionBg}>
    <mj-column>
      <mj-divider border-width="${dividerWidth}" border-color="${dividerColor}" width="100%"></mj-divider>
    </mj-column>
  </mj-section>` + nextSection;
    });
  }

  // Color overrides for hardcoded block colors (keep brand tones)
  if (skin.extras.colorOverrides) {
    const swaps = [
      { re: /color="#ffd700"/gi, repl: `color="${skin.palette.brand}"` },
      { re: /color="#ffb400"/gi, repl: `color="${skin.palette.brand}"` },
      { re: /color="#ff4d4d"/gi, repl: `color="${skin.palette.brandAlt}"` },
      { re: /background-color="#ffd700"/gi, repl: `background-color="${skin.palette.brand}"` },
      { re: /background-color="#ffb400"/gi, repl: `background-color="${skin.palette.brand}"` },
      { re: /background-color="#ff4d4d"/gi, repl: `background-color="${skin.palette.brandAlt}"` }
    ];
    for (const { re, repl } of swaps) out = out.replace(re, repl);
  }

  return out;
}
