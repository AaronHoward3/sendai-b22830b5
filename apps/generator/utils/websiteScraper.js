import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

/**
 * Scrapes a website to extract font families and button styles
 * @param {string} domain - The domain to scrape (e.g., "example.com")
 * @returns {Promise<Object>} Object containing fonts and button styles
 */
export async function scrapeWebsiteStyles(domain) {
  try {
    const url = `https://${domain}`;
    console.log(`🔍 Scraping styles from: ${url}`);
    
    // Fetch the website with shorter timeout
    const response = await axios.get(url, {
      timeout: 1500, // Shorter timeout to match outer timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract fonts
    const fonts = extractFonts($, html);
    
    // Extract button styles
    const buttonStyles = extractButtonStyles($);
    
    return {
      fonts,
      buttonStyles,
      success: true,
      url
    };
    
  } catch (error) {
    console.warn(`⚠️ Failed to scrape ${domain}:`, error.message);
    return {
      fonts: getFallbackFonts(),
      buttonStyles: getFallbackButtonStyles(),
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract font families from CSS and HTML with improved detection
 */
function extractFonts($, html) {
  const fontUsage = new Map(); // Track font usage frequency and importance
  
  // Extract from CSS files (highest priority)
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      // Extract fonts from CSS URLs (Google Fonts, etc.)
      if (href.includes('fonts.googleapis.com')) {
        const fontMatch = href.match(/family=([^&]+)/);
        if (fontMatch) {
          const fontFamily = fontMatch[1].replace(/\+/g, ' ').replace(/:/g, ', ');
          const primaryFont = fontFamily.split(',')[0].trim();
          fontUsage.set(primaryFont, (fontUsage.get(primaryFont) || 0) + 10); // High weight for Google Fonts
        }
      }
      // Extract fonts from other font services
      if (href.includes('fonts.adobe.com') || href.includes('typekit.net')) {
        const fontMatch = href.match(/family=([^&]+)/);
        if (fontMatch) {
          const fontFamily = fontMatch[1].replace(/\+/g, ' ').replace(/:/g, ', ');
          const primaryFont = fontFamily.split(',')[0].trim();
          fontUsage.set(primaryFont, (fontUsage.get(primaryFont) || 0) + 9); // High weight for Adobe Fonts
        }
      }
    }
  });
  
  // Extract from <style> tags (high priority)
  $('style').each((i, el) => {
    const css = $(el).html();
    if (css) {
      // More comprehensive font-family matching
      const fontMatches = css.match(/font-family:\s*([^;}]+)/gi);
      if (fontMatches) {
        fontMatches.forEach(match => {
          const fontFamily = match.replace(/font-family:\s*/i, '').trim().replace(/['"]/g, '');
          const primaryFont = fontFamily.split(',')[0].trim();
          // Clean up the font name
          const cleanFont = primaryFont.replace(/['"]/g, '').trim();
          if (cleanFont && !cleanFont.includes('inherit') && !cleanFont.includes('initial')) {
            fontUsage.set(cleanFont, (fontUsage.get(cleanFont) || 0) + 8); // High weight for style tags
          }
        });
      }
      
      // Also look for @font-face declarations
      const fontFaceMatches = css.match(/@font-face\s*\{[^}]*font-family:\s*['"]?([^'";}]+)['"]?[^}]*\}/gi);
      if (fontFaceMatches) {
        fontFaceMatches.forEach(match => {
          const fontFamilyMatch = match.match(/font-family:\s*['"]?([^'";}]+)['"]?/i);
          if (fontFamilyMatch) {
            const fontFamily = fontFamilyMatch[1].trim().replace(/['"]/g, '');
            fontUsage.set(fontFamily, (fontUsage.get(fontFamily) || 0) + 12); // Highest weight for @font-face
          }
        });
      }
    }
  });
  
  // Extract from inline styles (medium priority)
  $('*').each((i, el) => {
    const style = $(el).attr('style');
    if (style) {
      const fontMatch = style.match(/font-family:\s*([^;]+)/i);
      if (fontMatch) {
        const fontFamily = fontMatch[1].trim().replace(/['"]/g, '');
        const primaryFont = fontFamily.split(',')[0].trim();
        fontUsage.set(primaryFont, (fontUsage.get(primaryFont) || 0) + 5); // Medium weight
      }
    }
  });
  
  // Extract from important elements (weighted by importance)
  const elementWeights = {
    'h1': 6, 'h2': 5, 'h3': 4, 'h4': 3, 'h5': 2, 'h6': 1,
    'p': 3, 'span': 2, 'div': 1, 'a': 2, 'button': 4, 'input': 2
  };
  
  Object.entries(elementWeights).forEach(([tag, weight]) => {
    $(tag).each((i, el) => {
      const computedStyle = $(el).css('font-family');
      if (computedStyle && computedStyle !== 'inherit' && computedStyle !== 'initial') {
        const primaryFont = computedStyle.split(',')[0].trim();
        fontUsage.set(primaryFont, (fontUsage.get(primaryFont) || 0) + weight);
      }
    });
  });
  
  // Extract from CSS classes that might indicate fonts
  $('[class*="font"], [class*="text"], [class*="heading"]').each((i, el) => {
    const computedStyle = $(el).css('font-family');
    if (computedStyle && computedStyle !== 'inherit' && computedStyle !== 'initial') {
      const primaryFont = computedStyle.split(',')[0].trim();
      fontUsage.set(primaryFont, (fontUsage.get(primaryFont) || 0) + 2); // Low weight for class-based
    }
  });
  
  // Sort fonts by usage frequency and importance
  const sortedFonts = Array.from(fontUsage.entries())
    .filter(([font]) => {
      // Clean up font names and filter out invalid ones
      const cleanFont = font.trim().replace(/['"]/g, '');
      return cleanFont && 
             !cleanFont.includes('inherit') && 
             !cleanFont.includes('initial') &&
             !cleanFont.includes('var(') &&
             !cleanFont.includes('--') &&
             cleanFont.length > 1;
    })
    .sort((a, b) => b[1] - a[1]) // Sort by weight descending
    .map(([font]) => font.trim().replace(/['"]/g, ''))
    .slice(0, 5); // Get top 5 fonts
  
  console.log(`🔍 Font usage analysis:`, Array.from(fontUsage.entries()).slice(0, 5));
  
  return sortedFonts.length > 0 ? sortedFonts : getFallbackFonts();
}

/**
 * Extract button styles from the website
 */
function extractButtonStyles($) {
  const buttonStyles = {
    borderRadius: null,
    padding: null,
    backgroundColor: null,
    color: null,
    fontSize: null,
    fontWeight: null,
    textTransform: null,
    boxShadow: null,
    border: null
  };
  
  // Look for buttons, links with button classes, and CTAs
  const buttonSelectors = [
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    '.btn',
    '.button',
    '.cta',
    '.call-to-action',
    '[class*="btn"]',
    '[class*="button"]',
    'a[class*="btn"]'
  ];
  
  let foundStyles = false;
  
  buttonSelectors.forEach(selector => {
    if (foundStyles) return;
    
    $(selector).each((i, el) => {
      if (foundStyles) return;
      
      const $el = $(el);
      
      // Extract computed styles
      const styles = {
        borderRadius: $el.css('border-radius'),
        padding: $el.css('padding'),
        backgroundColor: $el.css('background-color'),
        color: $el.css('color'),
        fontSize: $el.css('font-size'),
        fontWeight: $el.css('font-weight'),
        textTransform: $el.css('text-transform'),
        boxShadow: $el.css('box-shadow'),
        border: $el.css('border')
      };
      
      // Check if this element has meaningful button styles
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
          styles.backgroundColor !== 'transparent') {
        buttonStyles.borderRadius = styles.borderRadius;
        buttonStyles.padding = styles.padding;
        buttonStyles.backgroundColor = styles.backgroundColor;
        buttonStyles.color = styles.color;
        buttonStyles.fontSize = styles.fontSize;
        buttonStyles.fontWeight = styles.fontWeight;
        buttonStyles.textTransform = styles.textTransform;
        buttonStyles.boxShadow = styles.boxShadow;
        buttonStyles.border = styles.border;
        foundStyles = true;
      }
    });
  });
  
  return foundStyles ? buttonStyles : getFallbackButtonStyles();
}

/**
 * Get fallback fonts when scraping fails
 */
function getFallbackFonts() {
  return [
    'Inter',
    'Roboto',
    'Open Sans'
  ];
}

/**
 * Get fallback button styles when scraping fails
 */
function getFallbackButtonStyles() {
  return {
    borderRadius: '6px',
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textTransform: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: 'none'
  };
}

/**
 * Find closest Google Font to a given font family with enhanced matching
 */
export function findClosestGoogleFont(fontFamily) {
  const googleFonts = [
    // Sans-serif fonts
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans Pro',
    'Nunito', 'Raleway', 'Ubuntu', 'Fira Sans', 'Work Sans', 'Cabin', 'Droid Sans',
    'Titillium Web', 'Dosis', 'Abel', 'Josefin Sans', 'Quicksand', 'Cantarell', 
    'Karla', 'Muli', 'Hind', 'Fjalla One', 'Anton', 'DM Sans', 'Manrope', 'Outfit',
    'Plus Jakarta Sans', 'Figtree', 'Satoshi', 'Geist', 'SF Pro Display', 'Arial',
    
    // Serif fonts
    'Playfair Display', 'Merriweather', 'PT Serif', 'Crimson Text', 'Libre Baskerville',
    'Droid Serif', 'Bitter', 'Vollkorn', 'Lora', 'PT Sans', 'Arimo', 'Bree Serif',
    'DM Serif Display', 'Crimson Pro', 'Source Serif Pro', 'Libre Caslon Text',
    
    // Display/Decorative fonts
    'Oswald', 'Dancing Script', 'Pacifico', 'Lobster', 'Righteous', 'Satisfy',
    'Bebas Neue', 'Fredoka One', 'Comfortaa', 'Orbitron', 'Russo One'
  ];
  
  if (!fontFamily) return 'Inter';
  
  const normalizedInput = fontFamily.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Direct match
  for (const font of googleFonts) {
    if (font.toLowerCase() === normalizedInput) {
      return font;
    }
  }
  
  // Enhanced partial matching with font characteristics
  const fontCharacteristics = {
    // Sans-serif characteristics
    'helvetica': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'helveticaneue': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'helvetica neue': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'arial': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'verdana': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'tahoma': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'trebuchet': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'calibri': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'segoe': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'futura': ['Montserrat', 'Poppins', 'Nunito'],
    'gotham': ['Montserrat', 'Poppins', 'Nunito'],
    'proxima': ['Montserrat', 'Poppins', 'Nunito'],
    'din': ['Montserrat', 'Poppins', 'Nunito'],
    'sfpro': ['Inter', 'Roboto', 'Open Sans'],
    'sfprodisplay': ['Inter', 'Roboto', 'Open Sans'],
    'system': ['Inter', 'Roboto', 'Open Sans'],
    'ui': ['Inter', 'Roboto', 'Open Sans'],
    
    // Brand-specific fonts
    'netflix': ['Josefin Sans', 'Montserrat', 'Poppins'],
    'netflixsans': ['Josefin Sans', 'Montserrat', 'Poppins'],
    'airbnb': ['Inter', 'Roboto', 'Open Sans'],
    'airbnbcereal': ['Inter', 'Roboto', 'Open Sans'],
    'cereal': ['Inter', 'Roboto', 'Open Sans'],
    'spotify': ['Inter', 'Roboto', 'Open Sans'],
    'spotifycircular': ['Inter', 'Roboto', 'Open Sans'],
    'circular': ['Inter', 'Roboto', 'Open Sans'],
    'nike': ['Inter', 'Roboto', 'Open Sans'],
    'adidas': ['Inter', 'Roboto', 'Open Sans'],
    'apple': ['Inter', 'Roboto', 'Open Sans'],
    'google': ['Inter', 'Roboto', 'Open Sans'],
    'microsoft': ['Inter', 'Roboto', 'Open Sans'],
    'amazon': ['Inter', 'Roboto', 'Open Sans'],
    
    // Serif characteristics
    'times': ['Merriweather', 'Crimson Text', 'Libre Baskerville'],
    'georgia': ['Merriweather', 'Crimson Text', 'Libre Baskerville'],
    'garamond': ['Crimson Text', 'Libre Baskerville', 'Crimson Pro'],
    'baskerville': ['Libre Baskerville', 'Crimson Text', 'Merriweather'],
    'caslon': ['Libre Caslon Text', 'Crimson Text', 'Libre Baskerville'],
    'minion': ['Crimson Text', 'Libre Baskerville', 'Merriweather'],
    'palatino': ['Crimson Text', 'Libre Baskerville', 'Merriweather'],
    
    // Display characteristics
    'impact': ['Oswald', 'Anton', 'Bebas Neue'],
    'franklin': ['Oswald', 'Anton', 'Bebas Neue'],
    'gill': ['Oswald', 'Anton', 'Bebas Neue'],
    'optima': ['Montserrat', 'Poppins', 'Nunito'],
    'avant': ['Montserrat', 'Poppins', 'Nunito'],
    'century': ['Merriweather', 'Crimson Text', 'Libre Baskerville'],
    
    // Modern characteristics
    'neue': ['Montserrat', 'Poppins', 'Nunito', 'Inter'],
    'modern': ['Montserrat', 'Poppins', 'Nunito', 'Inter'],
    'clean': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'minimal': ['Inter', 'Roboto', 'Open Sans', 'Lato'],
    'sleek': ['Montserrat', 'Poppins', 'Nunito', 'Inter'],
    'cereal': ['Inter', 'Roboto', 'Open Sans'],
    'circular': ['Inter', 'Roboto', 'Open Sans'],
    'frutiger': ['Inter', 'Roboto', 'Open Sans']
  };
  
  // Check for characteristic matches
  for (const [characteristic, fonts] of Object.entries(fontCharacteristics)) {
    if (normalizedInput.includes(characteristic)) {
      return fonts[0]; // Return the first (most common) match
    }
  }
  
  // Partial match with similarity scoring
  let bestMatch = 'Inter';
  let bestScore = 0;
  
  for (const font of googleFonts) {
    const normalizedFont = font.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Calculate similarity score
    let score = 0;
    
    // Exact substring match
    if (normalizedInput.includes(normalizedFont) || normalizedFont.includes(normalizedInput)) {
      score += 10;
    }
    
    // Character overlap
    const inputChars = new Set(normalizedInput);
    const fontChars = new Set(normalizedFont);
    const overlap = [...inputChars].filter(char => fontChars.has(char)).length;
    score += overlap * 2;
    
    // Length similarity
    const lengthDiff = Math.abs(normalizedInput.length - normalizedFont.length);
    score += Math.max(0, 5 - lengthDiff);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = font;
    }
  }
  
  // If we have a reasonable match, use it
  if (bestScore >= 5) {
    return bestMatch;
  }
  
  // Fallback based on font type detection
  if (normalizedInput.includes('serif') || normalizedInput.includes('roman')) {
    return 'Merriweather';
  } else if (normalizedInput.includes('mono') || normalizedInput.includes('code')) {
    return 'Fira Sans';
  } else if (normalizedInput.includes('display') || normalizedInput.includes('headline')) {
    return 'Montserrat';
  }
  
  // Default fallback
  return 'Inter';
}

/**
 * Use OpenAI Vision API to analyze website screenshots for font detection
 * @param {string} domain - The domain to analyze
 * @returns {Promise<Object>} Object containing detected fonts from vision analysis
 */
export async function analyzeWebsiteWithVision(domain) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Take a screenshot of the website
    const screenshotUrl = await takeWebsiteScreenshot(domain);
    if (!screenshotUrl) {
      console.log(`⚠️ Screenshot capture failed for ${domain}, skipping vision analysis`);
      return { success: false, error: 'Failed to capture screenshot' };
    }
    
    console.log(`📸 Screenshot captured for vision analysis: ${screenshotUrl.split('?')[0]}`);
    
    // Add timeout to vision analysis
    const visionTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Vision analysis timeout'));
      }, 15000); // 15 second timeout
    });
    
    // Analyze the screenshot with Vision API
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Look at this website screenshot and identify the fonts used. Focus on the main headings, navigation text, and body text. Look for distinctive typography characteristics like serif vs sans-serif, weight (bold/light), and style (modern/classic). If you can identify specific font names, list them. If not, describe the font characteristics (e.g., 'modern sans-serif', 'classic serif', 'bold condensed'). Return only font names or characteristics separated by commas, in order of prominence."
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshotUrl
                }
              }
            ]
          }
        ],
        max_tokens: 150
      }),
      visionTimeoutPromise
    ]);
    
    const visionAnalysis = response.choices[0].message.content;
    
    // Check if the analysis indicates it can't analyze the image
    if (visionAnalysis.toLowerCase().includes("unable to analyze") || 
        visionAnalysis.toLowerCase().includes("cannot identify") ||
        visionAnalysis.toLowerCase().includes("cannot see") ||
        visionAnalysis.toLowerCase().includes("image is not clear")) {
      console.log(`⚠️ Vision analysis unable to analyze image: ${visionAnalysis}`);
      return {
        success: false,
        error: 'Vision analysis unable to analyze image',
        analysis: visionAnalysis
      };
    }
    
    const detectedFonts = visionAnalysis
      .split(',')
      .map(font => font.trim())
      .filter(font => font.length > 0 && !font.toLowerCase().includes('unable'))
      .slice(0, 3); // Take top 3 fonts
    
    console.log(`🔍 Vision analysis detected fonts: ${detectedFonts.join(', ')}`);
    
    return {
      success: true,
      fonts: detectedFonts,
      analysis: visionAnalysis
    };
    
  } catch (error) {
    console.warn(`⚠️ Vision analysis failed for ${domain}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Take a screenshot of a website using multiple screenshot services
 * @param {string} domain - The domain to screenshot
 * @returns {Promise<string>} URL of the screenshot
 */
async function takeWebsiteScreenshot(domain) {
  const screenshotServices = [
    // Service 1: ScreenshotAPI (more reliable)
    `https://shot.screenshotapi.net/screenshot?token=${process.env.SCREENSHOT_API_KEY || 'demo'}&url=https://${domain}&width=1280&height=720&format=png&full_page=true`,
    
    // Service 2: HTMLCSStoImage (backup)
    `https://htmlcsstoimage.com/demo?url=https://${domain}`,
    
    // Service 3: ScreenshotMachine (original)
    `https://api.screenshotmachine.com?key=demo&url=https://${domain}&dimension=1280x720&format=png&fullpage=1`,
    
    // Service 4: Simple screenshot service
    `https://api.screenshotone.com/take?access_key=${process.env.SCREENSHOT_ONE_KEY || 'demo'}&url=https://${domain}&viewport_width=1280&viewport_height=720&format=png`
  ];
  
  for (const screenshotUrl of screenshotServices) {
    try {
      console.log(`📸 Trying screenshot service: ${screenshotUrl.split('?')[0]}`);
      
      // Verify the screenshot exists
      const response = await axios.head(screenshotUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ Screenshot captured successfully: ${screenshotUrl.split('?')[0]}`);
        return screenshotUrl;
      }
    } catch (error) {
      console.log(`⚠️ Screenshot service failed: ${error.message}`);
      continue;
    }
  }
  
  console.warn(`⚠️ All screenshot services failed for ${domain}`);
  return null;
}

/**
 * Enhanced website scraping with both CSS analysis and vision detection
 * @param {string} domain - The domain to scrape
 * @returns {Promise<Object>} Object containing fonts and button styles
 */
export async function scrapeWebsiteStylesEnhanced(domain) {
  try {
    console.log(`🔍 Enhanced scraping for: ${domain}`);
    
    // Run CSS scraping and vision analysis in parallel
    const [cssResult, visionResult] = await Promise.allSettled([
      scrapeWebsiteStyles(domain),
      analyzeWebsiteWithVision(domain)
    ]);
    
    const cssData = cssResult.status === 'fulfilled' ? cssResult.value : { success: false };
    const visionData = visionResult.status === 'fulfilled' ? visionResult.value : { success: false };
    
    // Combine results intelligently
    let combinedFonts = [];
    
    if (cssData.success && cssData.fonts) {
      combinedFonts = [...cssData.fonts];
    }
    
    if (visionData.success && visionData.fonts) {
      // Add vision-detected fonts that aren't already in CSS results
      const newFonts = visionData.fonts.filter(font => 
        !combinedFonts.some(existing => 
          existing.toLowerCase().includes(font.toLowerCase()) || 
          font.toLowerCase().includes(existing.toLowerCase())
        )
      );
      combinedFonts = [...combinedFonts, ...newFonts];
    }
    
    // If we have no fonts from either method, use fallback
    if (combinedFonts.length === 0) {
      combinedFonts = getFallbackFonts();
    }
    
    // Find the best Google Font match for the primary font
    const primaryFont = findClosestGoogleFont(combinedFonts[0]);
    
    console.log(`✅ Enhanced scraping complete: CSS fonts: ${cssData.fonts?.join(', ') || 'none'}, Vision fonts: ${visionData.fonts?.join(', ') || 'none'}, Primary: ${primaryFont}`);
    
    return {
      fonts: combinedFonts,
      primaryFont: primaryFont,
      buttonStyles: cssData.buttonStyles || getFallbackButtonStyles(),
      success: true,
      url: `https://${domain}`,
      sources: {
        css: cssData.success,
        vision: visionData.success
      }
    };
    
  } catch (error) {
    console.warn(`⚠️ Enhanced scraping failed for ${domain}:`, error.message);
    return {
      fonts: getFallbackFonts(),
      primaryFont: 'Inter',
      buttonStyles: getFallbackButtonStyles(),
      success: false,
      error: error.message
    };
  }
}
