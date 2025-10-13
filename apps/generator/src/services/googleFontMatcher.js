// src/services/googleFontMatcher.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Popular Google Fonts database for matching
const GOOGLE_FONTS = {
  // Sans-serif fonts
  "Inter": { category: "sans-serif", weights: [400, 500, 600, 700, 800, 900] },
  "Poppins": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Roboto": { category: "sans-serif", weights: [300, 400, 500, 700, 900] },
  "Open Sans": { category: "sans-serif", weights: [300, 400, 600, 700, 800] },
  "Lato": { category: "sans-serif", weights: [300, 400, 700, 900] },
  "Montserrat": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Source Sans Pro": { category: "sans-serif", weights: [300, 400, 600, 700, 900] },
  "Nunito": { category: "sans-serif", weights: [300, 400, 600, 700, 800, 900] },
  "Raleway": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Ubuntu": { category: "sans-serif", weights: [300, 400, 500, 700] },
  "Work Sans": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Fira Sans": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Noto Sans": { category: "sans-serif", weights: [400, 500, 600, 700] },
  "PT Sans": { category: "sans-serif", weights: [400, 700] },
  "Dosis": { category: "sans-serif", weights: [300, 400, 500, 600, 700, 800] },
  
  // Serif fonts
  "Playfair Display": { category: "serif", weights: [400, 500, 600, 700, 800, 900] },
  "Merriweather": { category: "serif", weights: [300, 400, 700, 900] },
  "Lora": { category: "serif", weights: [400, 500, 600, 700] },
  "Crimson Text": { category: "serif", weights: [400, 600, 700] },
  "Libre Baskerville": { category: "serif", weights: [400, 700] },
  "PT Serif": { category: "serif", weights: [400, 700] },
  "Source Serif Pro": { category: "serif", weights: [400, 600, 700] },
  "Noto Serif": { category: "serif", weights: [400, 700] },
  "Cormorant Garamond": { category: "serif", weights: [300, 400, 500, 600, 700] },
  "EB Garamond": { category: "serif", weights: [400, 500, 600, 700, 800] },
  
  // Display fonts
  "Oswald": { category: "display", weights: [300, 400, 500, 600, 700] },
  "Bebas Neue": { category: "display", weights: [400] },
  "Anton": { category: "display", weights: [400] },
  "Righteous": { category: "display", weights: [400] },
  "Fredoka One": { category: "display", weights: [400] },
  "Bungee": { category: "display", weights: [400] },
  "Creepster": { category: "display", weights: [400] },
  "Fascinate": { category: "display", weights: [400] },
  
  // Monospace fonts
  "Roboto Mono": { category: "monospace", weights: [300, 400, 500, 700] },
  "Source Code Pro": { category: "monospace", weights: [300, 400, 500, 600, 700, 800, 900] },
  "Fira Code": { category: "monospace", weights: [300, 400, 500, 600, 700] },
  "JetBrains Mono": { category: "monospace", weights: [300, 400, 500, 600, 700, 800] }
};

/**
 * Enhanced font matching using AI to find the closest Google Font
 * @param {string} detectedFont - The font name detected from the brand
 * @param {string} fontCategory - 'heading' or 'body'
 * @param {string} brandUrl - The brand URL for context
 * @returns {Promise<{matchedFont: string, confidence: number, reasoning: string, googleFontUrl: string}>}
 */
export async function findClosestGoogleFont(detectedFont, fontCategory = 'body', brandUrl = '') {
  if (!detectedFont || detectedFont.toLowerCase() === 'inter') {
    return {
      matchedFont: 'Inter',
      confidence: 1.0,
      reasoning: 'Default fallback font',
      googleFontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    };
  }

  try {
    console.log(`🔍 Finding Google Font match for "${detectedFont}" (${fontCategory})`);
    
    // First, try exact match
    const exactMatch = GOOGLE_FONTS[detectedFont];
    if (exactMatch) {
      const weights = fontCategory === 'heading' ? [600, 700, 800, 900] : [400, 500, 600];
      const availableWeights = weights.filter(w => exactMatch.weights.includes(w));
      const weightString = availableWeights.length > 0 ? availableWeights.join(';') : '400;500;600';
      
      return {
        matchedFont: detectedFont,
        confidence: 1.0,
        reasoning: 'Exact match found in Google Fonts',
        googleFontUrl: `https://fonts.googleapis.com/css2?family=${detectedFont.replace(/\s+/g, '+')}:wght@${weightString}&display=swap`
      };
    }

    // Use AI to find the closest match
    const aiMatch = await findClosestFontWithAI(detectedFont, fontCategory, brandUrl);
    if (aiMatch) {
      return aiMatch;
    }

    // Fallback to simple string matching
    return findClosestFontBySimilarity(detectedFont, fontCategory);

  } catch (error) {
    console.error('❌ Error in Google Font matching:', error.message);
    return {
      matchedFont: 'Inter',
      confidence: 0.3,
      reasoning: 'Error in matching, using fallback',
      googleFontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    };
  }
}

/**
 * Use AI to find the closest Google Font match
 */
async function findClosestFontWithAI(detectedFont, fontCategory, brandUrl) {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set, skipping AI font matching');
    return null;
  }

  try {
    const googleFontsList = Object.keys(GOOGLE_FONTS).join(', ');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a typography expert. Given a font name, find the closest matching Google Font from the provided list.

Available Google Fonts: ${googleFontsList}

Consider:
- Font style (serif, sans-serif, display, monospace)
- Character shapes and proportions
- Weight availability
- Overall visual similarity

Respond with JSON only:
{
  "matchedFont": "Font Name",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this is the best match"
}`
        },
        {
          role: "user",
          content: `Find the closest Google Font match for "${detectedFont}" used as ${fontCategory} font${brandUrl ? ` for brand ${brandUrl}` : ''}.`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Parse JSON response
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    } else if (content.includes('```')) {
      jsonContent = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
    }

    const match = JSON.parse(jsonContent);
    
    // Validate the matched font exists in our database
    if (!GOOGLE_FONTS[match.matchedFont]) {
      console.log(`⚠️  AI suggested "${match.matchedFont}" which is not in our database`);
      return null;
    }

    // Generate Google Fonts URL
    const fontInfo = GOOGLE_FONTS[match.matchedFont];
    const weights = fontCategory === 'heading' ? [600, 700, 800, 900] : [400, 500, 600];
    const availableWeights = weights.filter(w => fontInfo.weights.includes(w));
    const weightString = availableWeights.length > 0 ? availableWeights.join(';') : '400;500;600';
    
    return {
      ...match,
      googleFontUrl: `https://fonts.googleapis.com/css2?family=${match.matchedFont.replace(/\s+/g, '+')}:wght@${weightString}&display=swap`
    };

  } catch (error) {
    console.error('❌ Error in AI font matching:', error.message);
    return null;
  }
}

/**
 * Fallback font matching using string similarity
 */
function findClosestFontBySimilarity(detectedFont, fontCategory) {
  const detectedLower = detectedFont.toLowerCase();
  let bestMatch = 'Inter';
  let bestScore = 0;

  for (const [fontName, fontInfo] of Object.entries(GOOGLE_FONTS)) {
    const fontLower = fontName.toLowerCase();
    
    // Calculate similarity score
    let score = 0;
    
    // Exact substring match
    if (fontLower.includes(detectedLower) || detectedLower.includes(fontLower)) {
      score += 0.8;
    }
    
    // Word overlap
    const detectedWords = detectedLower.split(/[\s\-_]+/);
    const fontWords = fontLower.split(/[\s\-_]+/);
    const overlap = detectedWords.filter(word => fontWords.includes(word)).length;
    score += (overlap / Math.max(detectedWords.length, fontWords.length)) * 0.6;
    
    // Category preference
    if (fontCategory === 'heading' && (fontInfo.category === 'display' || fontInfo.category === 'serif')) {
      score += 0.2;
    } else if (fontCategory === 'body' && fontInfo.category === 'sans-serif') {
      score += 0.2;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = fontName;
    }
  }

  const fontInfo = GOOGLE_FONTS[bestMatch];
  const weights = fontCategory === 'heading' ? [600, 700, 800, 900] : [400, 500, 600];
  const availableWeights = weights.filter(w => fontInfo.weights.includes(w));
  const weightString = availableWeights.length > 0 ? availableWeights.join(';') : '400;500;600';

  return {
    matchedFont: bestMatch,
    confidence: Math.min(bestScore, 0.7),
    reasoning: `String similarity match (score: ${bestScore.toFixed(2)})`,
    googleFontUrl: `https://fonts.googleapis.com/css2?family=${bestMatch.replace(/\s+/g, '+')}:wght@${weightString}&display=swap`
  };
}

/**
 * Enhanced font detection with Google Fonts matching and logging
 */
export async function enhanceFontDetectionWithGoogleMatching(url, existingHints = {}) {
  const startTime = Date.now();
  
  console.log(`\n🎨 === FONT DETECTION & MATCHING START ===`);
  console.log(`🔗 Brand URL: ${url}`);
  console.log(`📝 Existing hints:`, existingHints);

  // Try vision-based detection first
  const { detectFontsWithVision } = await import('./visionFontDetector.js');
  const visionResult = await detectFontsWithVision(url);
  
  let detectedFonts = {};
  let detectionMethod = 'default';
  let detectionConfidence = 0.3;

  if (visionResult && visionResult.confidence > 0.7) {
    detectedFonts = {
      heading: visionResult.heading,
      body: visionResult.body
    };
    detectionMethod = 'vision';
    detectionConfidence = visionResult.confidence;
    console.log(`👁️  Vision detection result:`, visionResult);
  } else if (existingHints.headingFontGuess || existingHints.bodyFontGuess) {
    detectedFonts = {
      heading: existingHints.headingFontGuess,
      body: existingHints.bodyFontGuess
    };
    detectionMethod = 'existing';
    detectionConfidence = 0.6;
    console.log(`📋 Using existing font hints`);
  } else {
    detectedFonts = {
      heading: 'Inter',
      body: 'Inter'
    };
    console.log(`🔄 Using default fonts`);
  }

  // Find Google Font matches
  const [headingMatch, bodyMatch] = await Promise.all([
    findClosestGoogleFont(detectedFonts.heading, 'heading', url),
    findClosestGoogleFont(detectedFonts.body, 'body', url)
  ]);

  const endTime = Date.now();
  const processingTime = endTime - startTime;

  // Comprehensive logging
  console.log(`\n📊 === FONT MATCHING RESULTS ===`);
  console.log(`⏱️  Processing time: ${processingTime}ms`);
  console.log(`🎯 Detection method: ${detectionMethod} (confidence: ${detectionConfidence})`);
  console.log(`\n📝 HEADING FONT:`);
  console.log(`   Detected: "${detectedFonts.heading}"`);
  console.log(`   Matched: "${headingMatch.matchedFont}"`);
  console.log(`   Confidence: ${headingMatch.confidence}`);
  console.log(`   Reasoning: ${headingMatch.reasoning}`);
  console.log(`   URL: ${headingMatch.googleFontUrl}`);
  console.log(`\n📝 BODY FONT:`);
  console.log(`   Detected: "${detectedFonts.body}"`);
  console.log(`   Matched: "${bodyMatch.matchedFont}"`);
  console.log(`   Confidence: ${bodyMatch.confidence}`);
  console.log(`   Reasoning: ${bodyMatch.reasoning}`);
  console.log(`   URL: ${bodyMatch.googleFontUrl}`);
  console.log(`\n🎨 === FONT DETECTION & MATCHING END ===\n`);

  // Log the font match for analysis
  const { logFontMatch } = await import('./fontLogger.js');
  await logFontMatch(url, {
    headingFontGuess: headingMatch.matchedFont,
    bodyFontGuess: bodyMatch.matchedFont,
    headingFontUrl: headingMatch.googleFontUrl,
    bodyFontUrl: bodyMatch.googleFontUrl,
    confidence: Math.min(detectionConfidence, headingMatch.confidence, bodyMatch.confidence),
    method: detectionMethod,
    details: {
      detectedFonts,
      headingMatch,
      bodyMatch,
      processingTime,
      detectionMethod,
      detectionConfidence
    }
  });

  return {
    headingFontGuess: headingMatch.matchedFont,
    bodyFontGuess: bodyMatch.matchedFont,
    headingFontUrl: headingMatch.googleFontUrl,
    bodyFontUrl: bodyMatch.googleFontUrl,
    confidence: Math.min(detectionConfidence, headingMatch.confidence, bodyMatch.confidence),
    method: detectionMethod,
    details: {
      detectedFonts,
      headingMatch,
      bodyMatch,
      processingTime,
      detectionMethod,
      detectionConfidence
    }
  };
}
