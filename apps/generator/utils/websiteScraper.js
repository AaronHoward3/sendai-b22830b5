import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

/**
 * Scrapes a website to extract font families and button styles
 * @param {string} domain - The domain to scrape (e.g., "example.com")
 * @returns {Promise<Object>} Object containing fonts and button styles
 */
export async function scrapeWebsiteStyles(domain) {
  try {
    const url = `https://${domain}`;
    console.log(`🔍 Scraping styles from: ${url}`);
    
    // Fetch the website
    const response = await axios.get(url, {
      timeout: 10000,
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
 * Extract font families from CSS and HTML
 */
function extractFonts($, html) {
  const fonts = new Set();
  
  // Extract from CSS files
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      // Extract fonts from CSS URLs (Google Fonts, etc.)
      if (href.includes('fonts.googleapis.com')) {
        const fontMatch = href.match(/family=([^&]+)/);
        if (fontMatch) {
          const fontFamily = fontMatch[1].replace(/\+/g, ' ').replace(/:/g, ', ');
          fonts.add(fontFamily);
        }
      }
    }
  });
  
  // Extract from inline styles
  $('*').each((i, el) => {
    const style = $(el).attr('style');
    if (style) {
      const fontMatch = style.match(/font-family:\s*([^;]+)/i);
      if (fontMatch) {
        fonts.add(fontMatch[1].trim().replace(/['"]/g, ''));
      }
    }
  });
  
  // Extract from <style> tags
  $('style').each((i, el) => {
    const css = $(el).html();
    if (css) {
      const fontMatches = css.match(/font-family:\s*([^;]+)/gi);
      if (fontMatches) {
        fontMatches.forEach(match => {
          const fontFamily = match.replace(/font-family:\s*/i, '').trim().replace(/['"]/g, '');
          fonts.add(fontFamily);
        });
      }
    }
  });
  
  // Extract from common headings and text elements
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'].forEach(tag => {
    $(tag).each((i, el) => {
      const computedStyle = $(el).css('font-family');
      if (computedStyle && computedStyle !== 'inherit') {
        fonts.add(computedStyle);
      }
    });
  });
  
  // Convert to array and clean up
  const fontArray = Array.from(fonts)
    .map(font => font.split(',')[0].trim()) // Take first font family
    .filter(font => font && !font.includes('inherit') && !font.includes('initial'))
    .slice(0, 3); // Limit to top 3 fonts
  
  return fontArray.length > 0 ? fontArray : getFallbackFonts();
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
 * Find closest Google Font to a given font family
 */
export function findClosestGoogleFont(fontFamily) {
  const googleFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans Pro',
    'Nunito', 'Raleway', 'Ubuntu', 'Playfair Display', 'Merriweather', 'PT Sans',
    'Oswald', 'Lora', 'Crimson Text', 'Fira Sans', 'Work Sans', 'Libre Baskerville',
    'Cabin', 'Droid Sans', 'Droid Serif', 'PT Serif', 'Crimson Text', 'Arimo',
    'Titillium Web', 'Dosis', 'Abel', 'Josefin Sans', 'Quicksand', 'Bitter',
    'Vollkorn', 'Cantarell', 'Karla', 'Muli', 'Hind', 'Fjalla One', 'Anton',
    'Bree Serif', 'Dancing Script', 'Pacifico', 'Lobster', 'Righteous', 'Satisfy'
  ];
  
  if (!fontFamily) return 'Inter';
  
  const normalizedInput = fontFamily.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Direct match
  for (const font of googleFonts) {
    if (font.toLowerCase() === normalizedInput) {
      return font;
    }
  }
  
  // Partial match
  for (const font of googleFonts) {
    if (normalizedInput.includes(font.toLowerCase()) || font.toLowerCase().includes(normalizedInput)) {
      return font;
    }
  }
  
  // Fallback to Inter
  return 'Inter';
}
