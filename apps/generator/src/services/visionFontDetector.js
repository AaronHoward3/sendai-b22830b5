import OpenAI from "openai";
import { createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Takes a screenshot of a website and uses OpenAI Vision to analyze fonts
 * @param {string} url - The website URL to analyze
 * @returns {Promise<{heading: string, body: string, confidence: number}>}
 */
export async function detectFontsWithVision(url) {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set, skipping vision font detection');
    return null;
  }

  try {
    console.log(`🔍 Analyzing fonts for ${url} using OpenAI Vision...`);
    
    // Take a screenshot of the website
    const screenshotPath = await takeScreenshot(url);
    
    if (!screenshotPath) {
      console.log('❌ Failed to take screenshot');
      return null;
    }

    // Analyze the screenshot with OpenAI Vision
    const fontAnalysis = await analyzeScreenshotWithVision(screenshotPath);
    
    // Clean up the screenshot file
    try {
      unlinkSync(screenshotPath);
    } catch (e) {
      console.log('⚠️  Could not clean up screenshot file:', e.message);
    }

    return fontAnalysis;

  } catch (error) {
    console.error('❌ Error in vision font detection:', error.message);
    return null;
  }
}

/**
 * Takes a screenshot of a website using Puppeteer
 * @param {string} url - The website URL
 * @returns {Promise<string|null>} - Path to screenshot file or null if failed
 */
async function takeScreenshot(url) {
  try {
    // Import puppeteer dynamically to avoid issues if not installed
    let puppeteer;
    try {
      puppeteer = await import('puppeteer');
    } catch (importError) {
      console.log('⚠️  Puppeteer not available, skipping screenshot-based font detection');
      return null;
    }
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to capture a good sample of the page
    await page.setViewport({ width: 1200, height: 800 });
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for fonts to load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    const screenshotPath = join(tmpdir(), `font-analysis-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false // Just capture the viewport
    });
    
    await browser.close();
    
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    return screenshotPath;
    
  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    return null;
  }
}

/**
 * Analyzes a screenshot using OpenAI Vision API to detect fonts
 * @param {string} screenshotPath - Path to the screenshot file
 * @returns {Promise<{heading: string, body: string, confidence: number}>}
 */
async function analyzeScreenshotWithVision(screenshotPath) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use the latest vision model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this website screenshot and identify the fonts being used. You are a typography expert with deep knowledge of web fonts.

FOCUS ON:
1. **Heading/Title fonts** - Look for large, prominent text like headers, titles, navigation, hero sections, logos
2. **Body/Paragraph fonts** - Look for smaller text in paragraphs, descriptions, product details, buttons

ANALYSIS CRITERIA:
- Character shapes (rounded vs angular, serif vs sans-serif)
- Letter spacing and proportions
- Font weight and style variations
- Overall visual characteristics
- Brand personality (modern, classic, playful, etc.)

COMMON FONT PATTERNS:
- Modern brands often use: Inter, Poppins, Montserrat, Roboto
- Luxury brands often use: Playfair Display, Merriweather, Lora
- Tech brands often use: Inter, Source Sans Pro, Fira Sans
- Fashion brands often use: Playfair Display, Montserrat, Raleway

Please respond with a JSON object in this exact format:
{
  "heading": "Font Name (e.g., Inter, Poppins, Playfair Display)",
  "body": "Font Name (e.g., Inter, Poppins, Source Sans Pro)",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of what you observed, including character shapes, brand personality, and why you chose these fonts"
}

If you cannot clearly identify a font, use "Inter" as the default. Confidence should be between 0.0 and 1.0 based on how certain you are about the font identification.`
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
      return null;
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
      console.log(`✅ Vision analysis result:`, analysis);
      return analysis;
    } catch (parseError) {
      console.log('❌ Failed to parse Vision response as JSON:', content);
      
      // Fallback: try to extract font names from text response
      const headingMatch = content.match(/heading["\s:]+([^",\n]+)/i);
      const bodyMatch = content.match(/body["\s:]+([^",\n]+)/i);
      
      return {
        heading: headingMatch?.[1]?.trim() || "Inter",
        body: bodyMatch?.[1]?.trim() || "Inter", 
        confidence: 0.5,
        reasoning: "Extracted from text response"
      };
    }

  } catch (error) {
    console.error('❌ Error analyzing screenshot with Vision:', error.message);
    return null;
  }
}

/**
 * Enhanced font detection that combines multiple methods
 * @param {string} url - Website URL
 * @param {object} existingHints - Existing font hints from other methods
 * @returns {Promise<object>} - Enhanced font hints
 */
export async function enhanceFontDetection(url, existingHints = {}) {
  // Try vision-based detection first
  const visionResult = await detectFontsWithVision(url);
  
  if (visionResult && visionResult.confidence > 0.7) {
    console.log(`🎯 High confidence vision detection (${visionResult.confidence}):`, {
      heading: visionResult.heading,
      body: visionResult.body
    });
    
    return {
      headingFontGuess: visionResult.heading,
      bodyFontGuess: visionResult.body,
      confidence: visionResult.confidence,
      method: 'vision',
      reasoning: visionResult.reasoning
    };
  }
  
  // Fall back to existing hints if vision detection is low confidence
  if (existingHints.headingFontGuess || existingHints.bodyFontGuess) {
    console.log(`📝 Using existing font hints:`, existingHints);
    return {
      ...existingHints,
      method: 'existing',
      confidence: 0.6
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
