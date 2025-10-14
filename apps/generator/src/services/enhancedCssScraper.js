import * as cheerio from 'cheerio';
import axios from 'axios';

/**
 * Enhanced CSS scraper that extracts real fonts from websites
 * @param {string} siteUrl - The website URL to scrape
 * @returns {Promise<{headingFont: string, bodyFont: string, fontUrls: string[], confidence: number}>}
 */
export async function scrapeRealFonts(siteUrl) {
  if (!siteUrl) return null;
  
  let url = siteUrl;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");

  try {
    console.log(`🔍 Scraping fonts from: ${url}`);
    
    // Fetch the main HTML page
    const html = await fetchWithTimeout(url, 10000);
    if (!html) {
      console.log('❌ Failed to fetch HTML');
      return null;
    }

    const $ = cheerio.load(html);
    
    // Extract all CSS sources
    const cssSources = await extractAllCssSources($, url);
    
    // Parse CSS for fonts
    const fontAnalysis = await analyzeCssForFonts(cssSources);
    
    console.log(`✅ Font analysis complete:`, fontAnalysis);
    return fontAnalysis;
    
  } catch (error) {
    console.error('❌ Error scraping fonts:', error.message);
    return null;
  }
}

/**
 * Extract all CSS sources from the HTML
 */
async function extractAllCssSources($, baseUrl) {
  const cssSources = [];
  
  // Get inline styles
  $('style').each((_, el) => {
    const css = $(el).html();
    if (css) {
      cssSources.push({
        type: 'inline',
        url: 'inline',
        css: css
      });
    }
  });
  
  // Get external stylesheets
  const stylesheetLinks = $('link[rel="stylesheet"]').map((_, el) => {
    const href = $(el).attr('href');
    return href ? new URL(href, baseUrl).toString() : null;
  }).get().filter(Boolean);
  
  // Fetch external stylesheets (limit to first 10 to avoid timeouts)
  for (const link of stylesheetLinks.slice(0, 10)) {
    try {
      const css = await fetchWithTimeout(link, 8000);
      if (css) {
        cssSources.push({
          type: 'external',
          url: link,
          css: css
        });
      }
    } catch (error) {
      console.log(`⚠️  Failed to fetch CSS from ${link}:`, error.message);
    }
  }
  
  return cssSources;
}

/**
 * Analyze CSS for font information
 */
async function analyzeCssForFonts(cssSources) {
  const fontFaces = [];
  const fontFamilies = [];
  const googleFonts = [];
  const cssVariables = new Map();
  
  // Combine all CSS
  const allCss = cssSources.map(source => source.css).join('\n');
  
  // Extract CSS custom properties (variables)
  const variableMatches = allCss.match(/--[\w-]+\s*:\s*[^;]+/gi) || [];
  variableMatches.forEach(match => {
    const [name, value] = match.split(':').map(s => s.trim());
    if (name && value) {
      cssVariables.set(name, value);
    }
  });
  
  // Extract @font-face declarations
  const fontFaceMatches = allCss.match(/@font-face\s*\{[^}]*\}/gi) || [];
  fontFaceMatches.forEach(match => {
    const familyMatch = match.match(/font-family\s*:\s*['"]?([^'";}]+)['"]?/i);
    const srcMatch = match.match(/src\s*:\s*([^;]+)/i);
    
    if (familyMatch && srcMatch) {
      fontFaces.push({
        family: familyMatch[1].trim().replace(/['"]/g, ''),
        src: srcMatch[1].trim()
      });
    }
  });
  
  // Extract font-family declarations (including CSS variables)
  const fontFamilyMatches = allCss.match(/font-family\s*:\s*([^;{}]+)/gi) || [];
  fontFamilyMatches.forEach(match => {
    const families = match.replace(/font-family\s*:\s*/i, '').split(',').map(f => 
      f.trim().replace(/['"]/g, '')
    );
    fontFamilies.push(...families);
  });
  
  // Extract Google Fonts imports
  const googleFontMatches = allCss.match(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^'"]+['"]?\)/gi) || [];
  googleFontMatches.forEach(match => {
    const urlMatch = match.match(/https:\/\/fonts\.googleapis\.com[^'"]+/);
    if (urlMatch) {
      googleFonts.push(urlMatch[0]);
    }
  });
  
  // Also check for Google Fonts in link tags (from HTML)
  const linkMatches = allCss.match(/https:\/\/fonts\.googleapis\.com[^'"]+/gi) || [];
  googleFonts.push(...linkMatches);
  
  // Resolve CSS variables to actual font names
  const resolvedFontFamilies = fontFamilies.map(font => {
    if (font.startsWith('var(--')) {
      const varName = font.match(/var\(--([^)]+)\)/)?.[1];
      if (varName && cssVariables.has(`--${varName}`)) {
        const value = cssVariables.get(`--${varName}`);
        // Extract font name from the CSS variable value
        const fontMatch = value.match(/['"]([^'"]+)['"]/) || value.match(/([^,\s]+)/);
        return fontMatch ? fontMatch[1] : font;
      }
    }
    return font;
  });
  
  // Analyze and categorize fonts
  const analysis = analyzeFontUsage(fontFaces, resolvedFontFamilies, googleFonts);
  
  // Analyze button styles
  const buttonAnalysis = analyzeButtonStyles(allCss, cssVariables);
  
  // Analyze colors (backgrounds and text)
  const colorAnalysis = analyzeColors(allCss, cssVariables);

  return {
    headingFont: analysis.heading,
    bodyFont: analysis.body,
    fontUrls: [...new Set(googleFonts)],
    buttonStyles: buttonAnalysis,
    colors: colorAnalysis,
    confidence: analysis.confidence,
    method: 'css-scraping',
    details: {
      fontFaces: fontFaces.length,
      fontFamilies: fontFamilies.length,
      googleFonts: googleFonts.length,
      topFonts: analysis.topFonts,
      cssVariables: cssVariables.size,
      buttonStyles: buttonAnalysis,
      colors: colorAnalysis
    }
  };
}

/**
 * Analyze font usage patterns to determine heading vs body fonts
 */
function analyzeFontUsage(fontFaces, fontFamilies, googleFonts) {
  // Count font usage (exclude generic fonts and system fonts)
  const fontCounts = {};
  fontFamilies.forEach(font => {
    if (font && 
        !font.includes('serif') && 
        !font.includes('sans-serif') && 
        !font.includes('monospace') &&
        !font.includes('inherit') &&
        !font.includes('initial') &&
        !font.includes('unset') &&
        font !== 'system-ui' &&
        font !== 'ui-sans-serif' &&
        font !== 'ui-serif' &&
        font !== 'ui-monospace' &&
        font.length > 2) {
      fontCounts[font] = (fontCounts[font] || 0) + 1;
    }
  });
  
  // Sort by usage
  const sortedFonts = Object.entries(fontCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([font]) => font);
  
  // Determine heading and body fonts
  let headingFont = 'Inter';
  let bodyFont = 'Inter';
  let confidence = 0.3;
  
  // Check for common heading/body patterns first
  const headingKeywords = ['display', 'heading', 'title', 'bold', 'black', 'heavy', 'semicondensed', 'condensed', 'wide'];
  const bodyKeywords = ['text', 'body', 'regular', 'book', 'light', 'normal'];
  
  let headingCandidate = null;
  let bodyCandidate = null;
  
  for (const font of sortedFonts) {
    const lowerFont = font.toLowerCase();
    
    if (headingKeywords.some(keyword => lowerFont.includes(keyword))) {
      headingCandidate = font;
      confidence = Math.max(confidence, 0.8);
    }
    
    if (bodyKeywords.some(keyword => lowerFont.includes(keyword))) {
      bodyCandidate = font;
      confidence = Math.max(confidence, 0.8);
    }
  }
  
  // Use pattern-matched fonts if found
  if (headingCandidate) {
    headingFont = headingCandidate;
  } else if (sortedFonts.length > 0) {
    headingFont = sortedFonts[0];
  }
  
  if (bodyCandidate) {
    bodyFont = bodyCandidate;
  } else if (sortedFonts.length > 1) {
    bodyFont = sortedFonts[1];
  } else if (sortedFonts.length === 1) {
    bodyFont = sortedFonts[0];
  }
  
  // If we have multiple fonts but no clear pattern, use first two
  if (sortedFonts.length >= 2 && !headingCandidate && !bodyCandidate) {
    headingFont = sortedFonts[0];
    bodyFont = sortedFonts[1];
    confidence = 0.7;
  } else if (sortedFonts.length === 1 && !headingCandidate && !bodyCandidate) {
    // Single font - use for both
    headingFont = sortedFonts[0];
    bodyFont = sortedFonts[0];
    confidence = 0.6;
  }
  
  return {
    heading: headingFont,
    body: bodyFont,
    confidence,
    topFonts: sortedFonts.slice(0, 5)
  };
}

/**
 * Fetch URL with timeout
 */
async function fetchWithTimeout(url, timeoutMs = 8000) {
  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    return response.data;
  } catch (error) {
    console.log(`⚠️  Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Enhanced font detection that prioritizes CSS scraping
 */
export async function enhanceFontDetectionWithCss(url, existingHints = {}) {
  // Try CSS scraping first (most accurate)
  const cssResult = await scrapeRealFonts(url);
  
  if (cssResult && cssResult.confidence > 0.6) {
    console.log(`🎯 High confidence CSS detection (${cssResult.confidence}):`, {
      heading: cssResult.headingFont,
      body: cssResult.bodyFont,
      fontUrls: cssResult.fontUrls.length
    });
    
    return {
      headingFontGuess: cssResult.headingFont,
      bodyFontGuess: cssResult.bodyFont,
      fontUrls: cssResult.fontUrls,
      buttonStyles: cssResult.buttonStyles,
      confidence: cssResult.confidence,
      method: 'css-scraping',
      details: cssResult.details
    };
  }
  
  // Fall back to existing hints if CSS scraping is low confidence
  if (existingHints.headingFontGuess || existingHints.bodyFontGuess) {
    console.log(`📝 Using existing font hints:`, existingHints);
    return {
      ...existingHints,
      method: 'existing',
      confidence: 0.5
    };
  }
  
  // Final fallback
  console.log(`🔄 No reliable font detection, using defaults`);
  return {
    headingFontGuess: "Inter",
    bodyFontGuess: "Inter", 
    method: 'default',
    confidence: 0.3
  };
}

/**
 * Analyze button styles from CSS
 */
function analyzeButtonStyles(css, cssVariables) {
  const buttonStyles = {
    variant: "filled", // filled | outline | ghost | gradient
    pad: "14px 22px",
    caps: false,
    letterSpacing: 0,
    radius: 6 // border radius in px
  };

  // Look for button-related CSS selectors
  const buttonSelectors = [
    /button[^{]*\{[^}]*\}/gi,
    /\.btn[^{]*\{[^}]*\}/gi,
    /\.button[^{]*\{[^}]*\}/gi,
    /\[class\*="btn"\]\s*\{[^}]*\}/gi,
    /input\[type="button"\][^{]*\{[^}]*\}/gi,
    /input\[type="submit"\][^{]*\{[^}]*\}/gi
  ];

  const buttonRules = [];
  buttonSelectors.forEach(selector => {
    const matches = css.match(selector) || [];
    buttonRules.push(...matches);
  });

  // Analyze button rules for common patterns
  for (const rule of buttonRules) {
    // Check for padding
    const paddingMatch = rule.match(/padding\s*:\s*([^;]+)/i);
    if (paddingMatch) {
      const padding = paddingMatch[1].trim();
      // Convert common padding patterns to our format
      if (padding.includes('px')) {
        buttonStyles.pad = padding;
      }
    }

    // Check for text-transform (uppercase/lowercase)
    const textTransformMatch = rule.match(/text-transform\s*:\s*([^;]+)/i);
    if (textTransformMatch) {
      const transform = textTransformMatch[1].trim().toLowerCase();
      buttonStyles.caps = transform === 'uppercase';
    }

    // Check for letter-spacing
    const letterSpacingMatch = rule.match(/letter-spacing\s*:\s*([^;]+)/i);
    if (letterSpacingMatch) {
      const spacing = letterSpacingMatch[1].trim();
      // Convert to em units if needed
      if (spacing.includes('px')) {
        const pxValue = parseFloat(spacing);
        buttonStyles.letterSpacing = pxValue / 16; // Convert px to em (assuming 16px base)
      } else if (spacing.includes('em')) {
        buttonStyles.letterSpacing = parseFloat(spacing);
      }
    }

    // Check for border-radius
    const borderRadiusMatch = rule.match(/border-radius\s*:\s*([^;]+)/i);
    if (borderRadiusMatch) {
      const radius = borderRadiusMatch[1].trim();
      // Extract pixel values
      const pxMatch = radius.match(/(\d+(?:\.\d+)?)px/);
      if (pxMatch) {
        buttonStyles.radius = parseFloat(pxMatch[1]);
      } else if (radius.includes('%')) {
        // Convert percentage to approximate pixel value (assuming button height ~40px)
        const percentMatch = radius.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          buttonStyles.radius = Math.round((percent / 100) * 40); // Approximate
        }
      }
    }

    // Check for border styles to determine variant
    const borderMatch = rule.match(/border\s*:\s*([^;]+)/i);
    const backgroundMatch = rule.match(/background\s*:\s*([^;]+)/i);
    
    if (borderMatch && !backgroundMatch) {
      // Has border but no background = outline
      buttonStyles.variant = "outline";
    } else if (backgroundMatch && backgroundMatch[1].includes('transparent')) {
      // Transparent background = ghost
      buttonStyles.variant = "ghost";
    } else if (backgroundMatch && backgroundMatch[1].includes('gradient')) {
      // Gradient background = gradient
      buttonStyles.variant = "gradient";
    }
  }

  return buttonStyles;
}

/**
 * Analyze colors from CSS (backgrounds and text)
 */
function analyzeColors(css, cssVariables) {
  const colorAnalysis = {
    backgrounds: [],
    textColors: [],
    primaryBackground: null,
    primaryTextColor: null,
    secondaryBackground: null,
    secondaryTextColor: null
  };

  // Extract all color values from CSS
  const colorMatches = [
    ...(css.match(/background-color\s*:\s*([^;{}]+)/gi) || []),
    ...(css.match(/background\s*:\s*([^;{}]+)/gi) || []),
    ...(css.match(/color\s*:\s*([^;{}]+)/gi) || []),
    ...(css.match(/border-color\s*:\s*([^;{}]+)/gi) || [])
  ];

  // Process each color match
  colorMatches.forEach(match => {
    const colorValue = match.split(':')[1]?.trim();
    if (!colorValue) return;

    // Extract hex colors
    const hexMatches = colorValue.match(/#[0-9a-fA-F]{3,6}/g);
    if (hexMatches) {
      hexMatches.forEach(hex => {
        // Determine if it's likely a background or text color based on context
        if (match.includes('background')) {
          colorAnalysis.backgrounds.push(hex);
        } else if (match.includes('color')) {
          colorAnalysis.textColors.push(hex);
        } else {
          // For border-color, add to both
          colorAnalysis.backgrounds.push(hex);
          colorAnalysis.textColors.push(hex);
        }
      });
    }

    // Extract CSS variable references
    const varMatches = colorValue.match(/var\(--([^)]+)\)/g);
    if (varMatches) {
      varMatches.forEach(varMatch => {
        const varName = varMatch.match(/var\(--([^)]+)\)/)[1];
        const varValue = cssVariables.get(`--${varName}`);
        if (varValue) {
          const hexInVar = varValue.match(/#[0-9a-fA-F]{3,6}/g);
          if (hexInVar) {
            hexInVar.forEach(hex => {
              if (match.includes('background')) {
                colorAnalysis.backgrounds.push(hex);
              } else if (match.includes('color')) {
                colorAnalysis.textColors.push(hex);
              }
            });
          }
        }
      });
    }
  });

  // Remove duplicates and filter out common colors
  const commonColors = ['#000000', '#ffffff', '#000', '#fff', '#transparent', 'transparent'];
  
  colorAnalysis.backgrounds = [...new Set(colorAnalysis.backgrounds)]
    .filter(color => !commonColors.includes(color.toLowerCase()));
  
  colorAnalysis.textColors = [...new Set(colorAnalysis.textColors)]
    .filter(color => !commonColors.includes(color.toLowerCase()));

  // Determine primary colors based on frequency and context
  if (colorAnalysis.backgrounds.length > 0) {
    // Most common background color becomes primary
    const bgCounts = {};
    colorAnalysis.backgrounds.forEach(bg => {
      bgCounts[bg] = (bgCounts[bg] || 0) + 1;
    });
    colorAnalysis.primaryBackground = Object.keys(bgCounts)
      .sort((a, b) => bgCounts[b] - bgCounts[a])[0];
    
    // Second most common becomes secondary
    const sortedBgs = Object.keys(bgCounts).sort((a, b) => bgCounts[b] - bgCounts[a]);
    if (sortedBgs.length > 1) {
      colorAnalysis.secondaryBackground = sortedBgs[1];
    }
  }

  if (colorAnalysis.textColors.length > 0) {
    // Most common text color becomes primary
    const textCounts = {};
    colorAnalysis.textColors.forEach(text => {
      textCounts[text] = (textCounts[text] || 0) + 1;
    });
    colorAnalysis.primaryTextColor = Object.keys(textCounts)
      .sort((a, b) => textCounts[b] - textCounts[a])[0];
    
    // Second most common becomes secondary
    const sortedTexts = Object.keys(textCounts).sort((a, b) => textCounts[b] - textCounts[a]);
    if (sortedTexts.length > 1) {
      colorAnalysis.secondaryTextColor = sortedTexts[1];
    }
  }

  console.log("🎨 [COLOR ANALYSIS] Backgrounds:", colorAnalysis.backgrounds);
  console.log("🎨 [COLOR ANALYSIS] Text colors:", colorAnalysis.textColors);
  console.log("🎨 [COLOR ANALYSIS] Primary background:", colorAnalysis.primaryBackground);
  console.log("🎨 [COLOR ANALYSIS] Primary text:", colorAnalysis.primaryTextColor);

  return colorAnalysis;
}
