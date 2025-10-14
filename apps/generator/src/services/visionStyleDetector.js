import OpenAI from "openai";
import { createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import puppeteer from 'puppeteer';

// Initialize OpenAI client only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Available promotion styles and their characteristics
 */
const PROMOTION_STYLES = {
  bold_contrasting: {
    name: "Bold & Contrasting",
    characteristics: [
      "high contrast colors",
      "bold typography", 
      "dramatic lighting",
      "strong visual hierarchy",
      "punchy call-to-actions",
      "dark backgrounds with bright accents",
      "sharp geometric elements",
      "energetic and attention-grabbing"
    ],
    bestFor: [
      "tech brands",
      "gaming companies", 
      "fitness brands",
      "energy drinks",
      "modern startups",
      "bold fashion brands"
    ]
  },
  minimal_clean: {
    name: "Minimal & Clean",
    characteristics: [
      "lots of whitespace",
      "simple typography",
      "clean backgrounds",
      "subtle colors",
      "minimal design elements",
      "soft lighting",
      "elegant simplicity",
      "breathing room"
    ],
    bestFor: [
      "luxury brands",
      "beauty products",
      "wellness brands",
      "premium services",
      "artisanal products",
      "sophisticated brands"
    ]
  },
  magazine_serif: {
    name: "Magazine Serif",
    characteristics: [
      "editorial feel",
      "sophisticated typography",
      "elegant composition",
      "refined aesthetics",
      "premium appearance",
      "structured layout",
      "artful design",
      "magazine-like presentation"
    ],
    bestFor: [
      "luxury brands",
      "premium products",
      "editorial content",
      "sophisticated brands",
      "high-end services",
      "artisanal goods"
    ]
  },
  warm_editorial: {
    name: "Warm Editorial",
    characteristics: [
      "editorial feel",
      "storytelling focus",
      "warm lighting",
      "paper texture",
      "cozy atmosphere",
      "narrative elements",
      "magazine-like layout",
      "inviting design"
    ],
    bestFor: [
      "food brands",
      "lifestyle brands",
      "craft products",
      "artisan goods",
      "heritage brands",
      "story-driven companies"
    ]
  }
};

/**
 * Takes a screenshot of a website and uses OpenAI Vision to analyze the appropriate promotion style
 * @param {string} url - The website URL to analyze
 * @returns {Promise<{style: string, confidence: number, reasoning: string}>}
 */
export async function detectPromotionStyleWithVision(url) {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set, using intelligent fallback for style detection');
    return getIntelligentStyleFallback(url, {});
  }

  try {
    console.log(`🎨 Analyzing promotion style for ${url} using OpenAI Vision...`);
    
    // Take a screenshot of the website
    const screenshotPath = await takeScreenshot(url);
    
    if (!screenshotPath) {
      console.log('❌ Failed to take screenshot');
      return { style: 'default', confidence: 0.5, reasoning: 'Failed to take screenshot' };
    }

    // Analyze the screenshot with OpenAI Vision
    const styleAnalysis = await analyzeScreenshotForStyle(screenshotPath);
    
    // Clean up the screenshot file
    try {
      unlinkSync(screenshotPath);
    } catch (e) {
      console.log('⚠️  Could not clean up screenshot file:', e.message);
    }

    return styleAnalysis;

  } catch (error) {
    console.error('❌ Error in vision style detection:', error.message);
    return { style: 'default', confidence: 0.5, reasoning: `Error: ${error.message}` };
  }
}

/**
 * Takes a screenshot of a website using Puppeteer
 * @param {string} url - The website URL
 * @returns {Promise<string|null>} - Path to screenshot file or null if failed
 */
async function takeScreenshot(url) {
  let browser;
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1200, height: 800 });
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the page with timeout
    await page.goto(fullUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = join(tmpdir(), `style-analysis-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false, // Only capture viewport for faster processing
      type: 'png'
    });

    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    return screenshotPath;

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Analyzes a screenshot using OpenAI Vision API to determine the best promotion style
 * @param {string} screenshotPath - Path to the screenshot file
 * @returns {Promise<{style: string, confidence: number, reasoning: string}>}
 */
async function analyzeScreenshotForStyle(screenshotPath) {
  if (!openai) {
    console.log('❌ OpenAI client not initialized');
    return { style: 'default', confidence: 0.3, reasoning: 'OpenAI client not available' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use the latest vision model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this website screenshot and determine which promotion style would best match this brand's visual identity.

AVAILABLE PROMOTION STYLES:

1. **bold_contrasting** - Bold & Contrasting
   - High contrast colors, bold typography, dramatic lighting
   - Strong visual hierarchy, punchy CTAs, dark backgrounds with bright accents
   - Best for: tech brands, gaming, fitness, energy drinks, modern startups

2. **minimal_clean** - Minimal & Clean  
   - Lots of whitespace, simple typography, clean backgrounds
   - Subtle colors, minimal design elements, soft lighting
   - Best for: luxury brands, beauty products, wellness, premium services

3. **magazine_serif** - Magazine Serif
   - Editorial feel, sophisticated typography, elegant composition
   - Refined aesthetics, premium appearance, structured layout
   - Best for: luxury brands, premium products, editorial content, sophisticated brands

4. **warm_editorial** - Warm Editorial
   - Editorial feel, storytelling focus, warm lighting
   - Paper texture, cozy atmosphere, narrative elements
   - Best for: food brands, lifestyle brands, craft products, artisan goods

ANALYSIS CRITERIA:
- Overall visual style and aesthetic
- Color palette and contrast levels
- Typography choices (serif vs sans-serif, bold vs light)
- Layout density and whitespace usage
- Brand personality and target audience
- Industry type and market positioning

Please respond with a JSON object in this exact format:
{
  "style": "bold_contrasting",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of what you observed, including visual elements, brand personality, and why this style best matches the website"
}

Choose the style that would create the most cohesive and effective promotional emails for this brand.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${require('fs').readFileSync(screenshotPath, 'base64')}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1 // Low temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('❌ No response from OpenAI Vision');
      return { style: 'default', confidence: 0.5, reasoning: 'No response from vision API' };
    }

    // Try to parse the JSON response
    try {
      // Try to extract JSON from markdown code blocks
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonContent = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }
      
      const analysis = JSON.parse(jsonContent);
      
      // Validate that the style is one of our available styles
      if (!PROMOTION_STYLES[analysis.style]) {
        console.log(`⚠️  Invalid style returned: ${analysis.style}, defaulting to 'default'`);
        analysis.style = 'default';
        analysis.confidence = Math.max(0.3, analysis.confidence - 0.2);
      }
      
      console.log(`✅ Vision style analysis result:`, analysis);
      return analysis;
    } catch (parseError) {
      console.log('❌ Failed to parse Vision response as JSON:', content);
      
      // Fallback: try to extract style from text response
      const styleMatch = content.match(/style["\s:]+([^",\n]+)/i);
      const extractedStyle = styleMatch?.[1]?.trim()?.toLowerCase();
      
      // Validate extracted style
      const validStyle = PROMOTION_STYLES[extractedStyle] ? extractedStyle : 'default';
      
      return {
        style: validStyle,
        confidence: 0.4,
        reasoning: "Extracted from text response"
      };
    }

  } catch (error) {
    console.error('❌ Error analyzing screenshot with Vision:', error.message);
    return { style: 'default', confidence: 0.3, reasoning: `Error: ${error.message}` };
  }
}

/**
 * Enhanced style detection that combines multiple methods
 * @param {string} url - Website URL
 * @param {object} existingHints - Existing brand hints from other methods
 * @returns {Promise<object>} - Enhanced style recommendations
 */
export async function enhanceStyleDetectionWithVision(url, existingHints = {}) {
  try {
    // If no API key, use intelligent fallback based on domain and hints
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  OPENAI_API_KEY not set, using intelligent fallback for style detection');
      return getIntelligentStyleFallback(url, existingHints);
    }

    // Get vision-based style recommendation
    const visionResult = await detectPromotionStyleWithVision(url);
    
    // Combine with existing hints for a more comprehensive recommendation
    const enhancedResult = {
      ...visionResult,
      method: 'vision',
      timestamp: new Date().toISOString(),
      url: url,
      existingHints: existingHints
    };

    // If we have existing brand data, we can cross-reference
    if (existingHints.brandType || existingHints.industry) {
      const brandType = existingHints.brandType?.toLowerCase() || '';
      const industry = existingHints.industry?.toLowerCase() || '';
      
      // Adjust confidence based on brand type alignment
      let confidenceAdjustment = 0;
      
      if (visionResult.style === 'bold_contrasting' && 
          (brandType.includes('tech') || brandType.includes('modern') || industry.includes('technology'))) {
        confidenceAdjustment = 0.1;
      } else if (visionResult.style === 'minimal_clean' && 
                 (brandType.includes('luxury') || brandType.includes('premium') || industry.includes('beauty'))) {
        confidenceAdjustment = 0.1;
      } else if (visionResult.style === 'editorial_story' && 
                 (brandType.includes('artisan') || brandType.includes('craft') || industry.includes('food'))) {
        confidenceAdjustment = 0.1;
      }
      
      enhancedResult.confidence = Math.min(0.95, visionResult.confidence + confidenceAdjustment);
      enhancedResult.reasoning += ` Enhanced by brand type alignment (${brandType}/${industry}).`;
    }

    return enhancedResult;
  } catch (error) {
    console.error('❌ Error in enhanced style detection:', error.message);
    return getIntelligentStyleFallback(url, existingHints);
  }
}

/**
 * Intelligent fallback when vision is not available
 * Uses domain analysis and brand hints to make smart style recommendations
 */
function getIntelligentStyleFallback(url, existingHints = {}) {
  console.log('🧠 Using intelligent fallback for style detection');
  
  const domain = url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const brandType = (existingHints.brandType || '').toLowerCase();
  const industry = (existingHints.industry || '').toLowerCase();
  
  // Domain-based heuristics
  const techDomains = ['apple.com', 'google.com', 'microsoft.com', 'stripe.com', 'shopify.com', 'github.com', 'figma.com'];
  const luxuryDomains = ['chanel.com', 'hermes.com', 'louisvuitton.com', 'rolex.com', 'tiffany.com'];
  const fashionDomains = ['nike.com', 'adidas.com', 'zara.com', 'h&m.com', 'uniqlo.com'];
  const foodDomains = ['starbucks.com', 'mcdonalds.com', 'subway.com', 'dominos.com'];
  
  // Brand type heuristics
  const techKeywords = ['tech', 'software', 'app', 'digital', 'innovation', 'startup'];
  const luxuryKeywords = ['luxury', 'premium', 'exclusive', 'elite', 'high-end', 'artisan'];
  const fashionKeywords = ['fashion', 'style', 'clothing', 'apparel', 'design'];
  const foodKeywords = ['food', 'restaurant', 'cafe', 'bakery', 'culinary', 'recipe'];
  
  let recommendedStyle = 'minimal_clean'; // Default to minimal_clean instead of 'default'
  let confidence = 0.6;
  let reasoning = 'Intelligent fallback based on domain and brand analysis. ';
  
  // Check domain patterns
  if (techDomains.some(d => domain.includes(d))) {
    recommendedStyle = 'bold_contrasting';
    confidence = 0.8;
    reasoning += `Domain "${domain}" matches tech company patterns. `;
  } else if (luxuryDomains.some(d => domain.includes(d))) {
    recommendedStyle = 'magazine_serif';
    confidence = 0.8;
    reasoning += `Domain "${domain}" matches luxury brand patterns. `;
  } else if (fashionDomains.some(d => domain.includes(d))) {
    recommendedStyle = 'bold_contrasting';
    confidence = 0.7;
    reasoning += `Domain "${domain}" matches fashion brand patterns. `;
  } else if (foodDomains.some(d => domain.includes(d))) {
    recommendedStyle = 'warm_editorial';
    confidence = 0.7;
    reasoning += `Domain "${domain}" matches food brand patterns. `;
  }
  
  // Check brand type keywords
  if (techKeywords.some(keyword => brandType.includes(keyword) || industry.includes(keyword))) {
    recommendedStyle = 'bold_contrasting';
    confidence = Math.max(confidence, 0.7);
    reasoning += `Brand type "${brandType}" suggests tech/modern aesthetic. `;
  } else if (luxuryKeywords.some(keyword => brandType.includes(keyword) || industry.includes(keyword))) {
    recommendedStyle = 'magazine_serif';
    confidence = Math.max(confidence, 0.7);
    reasoning += `Brand type "${brandType}" suggests luxury/premium aesthetic. `;
  } else if (fashionKeywords.some(keyword => brandType.includes(keyword) || industry.includes(keyword))) {
    recommendedStyle = 'bold_contrasting';
    confidence = Math.max(confidence, 0.6);
    reasoning += `Brand type "${brandType}" suggests fashion/creative aesthetic. `;
  } else if (foodKeywords.some(keyword => brandType.includes(keyword) || industry.includes(keyword))) {
    recommendedStyle = 'warm_editorial';
    confidence = Math.max(confidence, 0.6);
    reasoning += `Brand type "${brandType}" suggests food/lifestyle aesthetic. `;
  }
  
  return {
    style: recommendedStyle,
    confidence: confidence,
    reasoning: reasoning.trim(),
    method: 'intelligent_fallback',
    timestamp: new Date().toISOString(),
    url: url,
    existingHints: existingHints
  };
}

export { PROMOTION_STYLES };
