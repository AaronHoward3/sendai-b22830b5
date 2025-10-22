import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';
import { scrapeWebsiteStyles, findClosestGoogleFont, scrapeWebsiteStylesEnhanced } from "./utils/websiteScraper.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3002;

// Supabase client for image storage
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    })
  : null;

// Cost constants (USD per 1M tokens for gpt-5-mini)
const INPUT_COST = 0.25 / 1_000_000;
const OUTPUT_COST = 2.00 / 1_000_000;
const IMAGE_COST = 0.04; // DALL-E 3 cost per image


// 🎯 Pick example image based on emailType and designAesthetic from payload
function pickExampleImage(emailType = null, designAesthetic = null) {
  // Map emailType to folder name (capitalize first letter)
  const emailTypeToFolderMap = {
    "promotion": "Promotion",
    "newsletter": "Newsletter"
  };
  
  // Map designAesthetic to folder name
  const designAestheticToFolderMap = {
    "minimal_clean": "minimal_clean",
    "bold_contrasting": "bold_contrasting",
    "magazine_serif": "magazine_serif",
    "minimal-clean": "minimal_clean", // Handle variations
    "bold-contrasting": "bold_contrasting", // Handle variations
    "magazine-serif": "magazine_serif" // Handle variations
  };
  
  const emailTypeFolder = emailTypeToFolderMap[emailType] || emailType;
  const designAestheticFolder = designAestheticToFolderMap[designAesthetic] || designAesthetic;
  
  // Build path: examples/{emailType}/{designAesthetic}/
  const dir = path.resolve("./examples", emailTypeFolder, designAestheticFolder);
  
  console.log(`🔍 Looking for examples in: ${dir}`);
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  No ./examples/${emailTypeFolder}/${designAestheticFolder} folder found — skipping image.`);
    return { part: null, filename: "none", layoutType: "none" };
  }

  const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f));
  if (!files.length) {
    console.warn(`⚠️  No example images found in ./examples/${emailTypeFolder}/${designAestheticFolder}.`);
    return { part: null, filename: "none", layoutType: "none" };
  }

  // Random selection from the emailType/designAesthetic-specific folder
  const selectedFile = files[Math.floor(Math.random() * files.length)];
  
  // Read and compress image to reduce token usage
  const buf = fs.readFileSync(path.join(dir, selectedFile));
  
  // For large images, we could compress them here, but for now just use as-is
  // Future optimization: Use sharp or similar to resize/compress images
  const mime = /\.png$/i.test(selectedFile) ? "image/png" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  const part = { type: "image_url", image_url: { url: dataUrl } };
  const layoutType = `${emailType}-${designAesthetic}` || "standard-layout";
  
  console.log(`✅ Selected example: ${selectedFile} from ${emailTypeFolder}/${designAestheticFolder} (${Math.round(buf.length/1024)}KB)`);
  
  return { part, filename: selectedFile, layoutType };
}

// 🎨 Generate safe image prompt with imageContext
function generateSafeImagePrompt(imageContext, brandName, emailType, designAesthetic) {
  // Base safe prompts for different email types and aesthetics
  const basePrompts = {
    promotion: {
      minimal_clean: "Clean, modern product showcase with subtle shadows and minimalist design",
      bold_contrasting: "Bold, vibrant product display with high contrast and dynamic composition",
      magazine_serif: "Elegant magazine-style product presentation with sophisticated typography and editorial layout"
    },
    newsletter: {
      minimal_clean: "Clean, professional newsletter header with subtle branding elements",
      bold_contrasting: "Dynamic newsletter banner with bold typography and striking visuals",
      magazine_serif: "Editorial-style newsletter header with classic typography and refined aesthetic"
    }
  };

  const basePrompt = basePrompts[emailType]?.[designAesthetic] || "Professional, clean marketing image";
  
  // Safely incorporate imageContext (limit length and filter inappropriate content)
  let safeContext = "";
  if (imageContext && typeof imageContext === 'string') {
    // Remove potentially problematic words and limit length
    safeContext = imageContext
      .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except basic punctuation
      .substring(0, 50) // Limit length to 50 chars for better performance
      .trim();
  }

  const brandPart = brandName ? `featuring ${brandName} branding` : '';
  
  return `${basePrompt}, ${brandPart}${safeContext ? `, ${safeContext}` : ''}, professional photography style, high quality, marketing appropriate`.trim();
}

// 🖼️ Generate image using GPT Image 1
async function generateHeroImage(prompt, brandId) {
  try {
    console.log(`🎨 Generating image with prompt: ${prompt}`);
    
    // Add timeout to prevent hanging requests - increased to 4 minutes for image generation
    const timeoutMs = 240000; // 4 minutes timeout (was 2 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Image generation timeout after 4 minutes'));
      }, timeoutMs);
    });

    const response = await Promise.race([
      openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        size: "1024x1024",
        quality: "high",
        n: 1,
      }),
      timeoutPromise
    ]);

    // GPT Image 1 returns b64_json instead of url
    const imageData = response.data[0].b64_json;
    if (!imageData) {
      throw new Error('No image data returned from GPT Image 1');
    }

    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${imageData}`;
    console.log(`✅ Image generated: ${imageUrl.substring(0, 50)}...`);
    
    return { success: true, imageUrl, prompt };
  } catch (error) {
    console.error(`❌ Image generation failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// 📤 Upload image to Supabase storage
async function uploadImageToSupabase(imageUrl, brandId, domain, filename) {
  if (!supabase) {
    console.warn("⚠️ Supabase not configured, cannot upload image");
    return { success: false, error: "Supabase not configured" };
  }

  try {
    let imageBuffer;
    
    // Handle data URLs (from GPT Image 1) vs regular URLs (from DALL-E)
    if (imageUrl.startsWith('data:')) {
      // Extract base64 data from data URL
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Download image from URL
      const imageResponse = await fetch(imageUrl);
      imageBuffer = await imageResponse.arrayBuffer();
    }
    
    // Upload to Supabase storage with consistent path structure
    const bucketName = process.env.SUPABASE_IMAGES_BUCKET || 'hero-images';
    const objectPath = `${bucketName}/${brandId}/${domain}/${filename}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error(`❌ Supabase upload failed:`, error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(objectPath);

    console.log(`✅ Image uploaded to Supabase: ${publicData.publicUrl}`);
    return { success: true, publicUrl: publicData.publicUrl };
  } catch (error) {
    console.error(`❌ Image upload failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// 🔄 Generate and upload hero image
async function generateAndUploadHeroImage(imageContext, brandData, emailType, designAesthetic) {
  // Extract proper identifiers, avoid 'default' fallbacks
  const brandId = brandData?.brand?.id || brandData?.id || 
                  brandData?.brand?.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
                  'generated';
  const brandName = brandData?.brand?.title || brandData?.title || 'Brand';
  const domain = brandData?.brand?.domain || brandData?.domain || 
                 brandData?.brand?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ||
                 'unknown';
  
  // Generate safe prompt
  const prompt = generateSafeImagePrompt(imageContext, brandName, emailType, designAesthetic);
  
  // Generate image
  const imageResult = await generateHeroImage(prompt, brandId);
  if (!imageResult.success) {
    return { success: false, error: imageResult.error };
  }
  
  // Upload to Supabase
  const filename = `hero-${Date.now()}.png`;
  console.log(`🔍 Image upload path: ${brandId}/${domain}/${filename}`);
  const uploadResult = await uploadImageToSupabase(imageResult.imageUrl, brandId, domain, filename);
  
  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error };
  }
  
  return { 
    success: true, 
    imageUrl: uploadResult.publicUrl,
    prompt: imageResult.prompt,
    cost: IMAGE_COST
  };
}

// 🚀 Start hero image generation asynchronously
function startHeroImageGeneration(imageContext, brandData, emailType, designAesthetic) {
  return new Promise((resolve) => {
    // Start the generation process asynchronously
    generateAndUploadHeroImage(imageContext, brandData, emailType, designAesthetic)
      .then(result => {
        console.log(`✅ Async hero image generation completed: ${result.success ? 'Success' : 'Failed'}`);
        resolve(result);
      })
      .catch(error => {
        console.error(`❌ Async hero image generation failed:`, error.message);
        resolve({ success: false, error: error.message });
      });
  });
}

// 🎨 Get design aesthetic specific styling
function getDesignAestheticStyles(designAesthetic) {
  const styles = {
    minimal_clean: {
      sectionPadding: "20px 0px",
      columnPadding: "10px",
      elementSpacing: "15px",
      lineHeight: "1.6",
      headingFontSize: "36px",
      headingFontWeight: "700",
      subheadingFontSize: "24px",
      subheadingFontWeight: "600",
      bodyFontSize: "16px", 
      bodyFontWeight: "400",
      buttonFontSize: "16px",
      buttonFontWeight: "600"
    },
    bold_contrasting: {
      sectionPadding: "25px 0px",
      columnPadding: "15px",
      elementSpacing: "20px",
      lineHeight: "1.5",
      headingFontSize: "42px",
      headingFontWeight: "800",
      subheadingFontSize: "28px",
      subheadingFontWeight: "700",
      bodyFontSize: "18px",
      bodyFontWeight: "600", 
      buttonFontSize: "18px",
      buttonFontWeight: "700"
    },
    magazine_serif: {
      sectionPadding: "30px 0px",
      columnPadding: "20px",
      elementSpacing: "25px",
      lineHeight: "1.7",
      headingFontSize: "38px",
      headingFontWeight: "400",
      subheadingFontSize: "26px",
      subheadingFontWeight: "300",
      bodyFontSize: "17px",
      bodyFontWeight: "300",
      buttonFontSize: "16px", 
      buttonFontWeight: "500"
    }
  };
  
  return styles[designAesthetic] || styles.minimal_clean;
}

// 🔗 Static placeholder URL for custom hero images
const CUSTOM_HERO_PLACEHOLDER = "https://via.placeholder.com/600x300/4f46e5/ffffff?text=Generating+Hero+Image...";

// 🎯 Determine hero image URL based on useCustomHeroImage flag
function getHeroImageUrl(enhancedPayload) {
  const useCustomHeroImage = enhancedPayload.useCustomHeroImage || enhancedPayload.brandData?.useCustomHeroImage || enhancedPayload.customHeroImage || enhancedPayload.brandData?.customHeroImage;
  
  if (useCustomHeroImage) {
    // Return placeholder URL - will be replaced with actual generated image
    return CUSTOM_HERO_PLACEHOLDER;
  } else {
    // Use saved image URL
    return enhancedPayload.brandData?.savedHeroImageUrl || 'none';
  }
}

// 🏷️ Extract brand logo URL from payload
export function getBrandLogoUrl(enhancedPayload) {
  // Try multiple possible paths for logo URL
  const logoUrl = enhancedPayload.brandData?.brand?.logos?.[0]?.url ||
                  enhancedPayload.brandData?.logo_url ||
                  enhancedPayload.brand?.logos?.[0]?.url ||
                  enhancedPayload.logo_url ||
                  null;
  
  console.log(`🏷️ Brand logo URL: ${logoUrl || 'none'}`);
  return logoUrl;
}

// 🖼️ Extract brand banner URL from payload
export function getBrandBannerUrl(enhancedPayload) {
  // Try multiple possible paths for banner URL
  const bannerUrl = enhancedPayload.brandData?.brand?.backdrops?.[0]?.url ||
                    enhancedPayload.brandData?.banner_url ||
                    enhancedPayload.brand?.backdrops?.[0]?.url ||
                    enhancedPayload.banner_url ||
                    null;
  
  console.log(`🖼️ Brand banner URL: ${bannerUrl || 'none'}`);
  return bannerUrl;
}

// 🧾 Simple logger
function logEvent(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  fs.appendFileSync("generation.log", line);
  console.log(line);
}

// 🧹 Clean and validate MJML output
function cleanMjmlOutput(rawOutput) {
  if (!rawOutput) return "";
  
  console.log("🔍 Raw output length:", rawOutput.length);
  console.log("🔍 Raw output preview:", rawOutput.substring(0, 300));
  
  // Remove markdown code fences
  let cleaned = rawOutput
    .replace(/```mjml\n?/gi, '')
    .replace(/```html\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  
  // Remove common prefixes that GPT-5 might add
  cleaned = cleaned
    .replace(/^Here's the MJML code:\s*/i, '')
    .replace(/^Here is the MJML:\s*/i, '')
    .replace(/^MJML code:\s*/i, '')
    .replace(/^The MJML:\s*/i, '')
    .replace(/^Generated MJML:\s*/i, '')
    .trim();
  
  // Extract MJML content if it's wrapped in explanations
  const mjmlMatch = cleaned.match(/<mjml[\s\S]*?<\/mjml>/i);
  if (mjmlMatch) {
    cleaned = mjmlMatch[0];
  }
  
  // Ensure it starts with <mjml
  if (!cleaned.toLowerCase().startsWith('<mjml')) {
    console.warn('⚠️ Output does not start with <mjml, attempting to fix...');
    // Try to find the actual MJML start
    const startMatch = cleaned.match(/<mjml/i);
    if (startMatch) {
      const startIndex = cleaned.indexOf(startMatch[0]);
      cleaned = cleaned.substring(startIndex);
    } else {
      console.error('❌ No <mjml tag found in output');
      return "";
    }
  }
  
  console.log("🔍 Cleaned output preview:", cleaned.substring(0, 200));
  return cleaned.trim();
}

// 🌐 Enhance payload with website-scraped styles (with timeout)
async function enhancePayloadWithWebsiteStyles(payload, timeoutMs = 5000) {
  // Debug: Log payload structure to understand the format
  console.log("🔍 Payload structure:", JSON.stringify(payload, null, 2));
  
  // Try multiple possible domain paths
  const domain = payload.brandData?.brand?.domain || 
                payload.brandData?.domain || 
                payload.domain || 
                payload.brandData?.brandData?.domain ||
                payload.brandData?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  console.log("🔍 Extracted domain:", domain);
  
  if (!domain) {
    console.log("⚠️ No domain found in payload, skipping website scraping");
    console.log("Available keys:", Object.keys(payload));
    return payload;
  }

  try {

    console.log(`🔍 Enhanced scraping website styles for: ${domain} (timeout: ${timeoutMs}ms)`);
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.log(`⏰ Website scraping timeout after ${timeoutMs}ms for ${domain}`);
        reject(new Error('Website scraping timeout'));
      }, timeoutMs);
    });
    
    // Use enhanced scraping with both CSS and vision analysis
    const scrapedData = await Promise.race([
      scrapeWebsiteStylesEnhanced(domain),
      timeoutPromise
    ]);
    
    if (scrapedData.success) {
      // Enhance payload with scraped data
      const enhancedPayload = {
        ...payload,
        scrapedStyles: {
          fonts: scrapedData.fonts,
          primaryFont: scrapedData.primaryFont,
          buttonStyles: scrapedData.buttonStyles,
          scrapedAt: new Date().toISOString(),
          source: scrapedData.url,
          sources: scrapedData.sources
        }
      };
      
      console.log(`✅ Enhanced scraping complete: Fonts: ${scrapedData.fonts.join(', ')}, Primary: ${scrapedData.primaryFont}, Sources: CSS=${scrapedData.sources?.css}, Vision=${scrapedData.sources?.vision}`);
      return enhancedPayload;
    } else {
      console.log(`⚠️ Enhanced website scraping failed for ${domain}: ${scrapedData.error}`);
      return payload;
    }
  } catch (error) {
    if (error.message === 'Website scraping timeout') {
      console.log(`⏰ Website scraping timed out after ${timeoutMs}ms for ${domain}, continuing without scraped styles`);
    } else {
      console.error(`❌ Error enhancing payload with website styles for ${domain}:`, error.message);
    }
    return payload;
  }
}

app.get("/healthz", (_, res) => res.json({ ok: true }));

// Test endpoint to verify service is working
app.get("/test", (_, res) => {
  res.json({
    service: "irios-generator",
    status: "running",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

// POST /generate  -> returns raw MJML
app.post("/generate", async (req, res) => {
  const startTime = performance.now();
  console.log(`📝 [GENERATOR] Received generation request at ${new Date().toISOString()}`);

  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};

    // Enhance payload with website-scraped styles (with fast mode option)
    const skipScraping = payload.skipScraping || payload.fastMode;
    const enhancedPayload = skipScraping ? payload : await enhancePayloadWithWebsiteStyles(payload);

    // Extract emailType and designAesthetic from payload
    const emailType = enhancedPayload.emailType || enhancedPayload.brandData?.emailType;
    const designAesthetic = enhancedPayload.designAesthetic || enhancedPayload.brandData?.designAesthetic || 'minimal_clean';
    
    console.log(`🔍 Extracted emailType: ${emailType}, designAesthetic: ${designAesthetic}`);
    
    // Check if we need to generate a custom hero image
    const useCustomHeroImage = enhancedPayload.useCustomHeroImage || enhancedPayload.brandData?.useCustomHeroImage || enhancedPayload.customHeroImage || enhancedPayload.brandData?.customHeroImage;
    const generateCustomHero = enhancedPayload.generateCustomHero || enhancedPayload.brandData?.generateCustomHero;
    const imageContext = enhancedPayload.imageContext || enhancedPayload.brandData?.imageContext;
    
    // CRITICAL: Only upload to Supabase if useCustomHeroImage is true (newly generated images only)
    // No other images (logos, banners, products, etc.) should ever be uploaded to Supabase
    
    let heroImageUrl = getHeroImageUrl(enhancedPayload);
    
    // Extract brand logo and banner URLs
    const brandLogoUrl = getBrandLogoUrl(enhancedPayload);
    const brandBannerUrl = getBrandBannerUrl(enhancedPayload);
    
    // Start hero image generation asynchronously if needed
    let heroImagePromise = null;
    const heroImageStartTime = performance.now();
    if (useCustomHeroImage && imageContext) {
      console.log(`🎨 Starting async hero image generation...`);
      console.log(`🎨 Image context: ${imageContext.substring(0, 100)}...`);
      console.log(`🎨 Use custom hero image: ${useCustomHeroImage}`);
      
      // Start the generation process asynchronously
      heroImagePromise = startHeroImageGeneration(
        imageContext, 
        enhancedPayload.brandData, 
        emailType, 
        designAesthetic
      );
      
      logEvent(`🎨 Async hero image generation started`);
    } else {
      console.log(`🎨 Custom hero image: ${useCustomHeroImage}, Image context: ${!!imageContext}`);
    }
    
    // Pick example image for layout reference
    const { part: imagePart, filename: imageFile, layoutType } = pickExampleImage(emailType, designAesthetic);

    // Add randomness to ensure unique generations
    const randomSeed = Math.random().toString(36).substring(7);
    const layoutVariations = ['modern', 'classic', 'minimalist', 'bold'];
    const randomLayout = layoutVariations[Math.floor(Math.random() * layoutVariations.length)];
    
    // Get design aesthetic specific styling
    const aestheticStyles = getDesignAestheticStyles(designAesthetic);
    
    // Extract only essential data to reduce token usage
    const essentialData = {
      brandName: enhancedPayload.brandData?.brand?.title || 'Brand',
      brandColors: {
        primary: enhancedPayload.brandData?.primary_color || '#4f46e5',
        link: enhancedPayload.brandData?.link_color || '#22d3ee'
      },
      heroImage: heroImageUrl,
      brandLogo: brandLogoUrl,
      brandBanner: brandBannerUrl,
      font: enhancedPayload.scrapedStyles?.primaryFont || 'Inter',
      products: enhancedPayload.brandData?.products || [],
      userContext: enhancedPayload.userContext || '',
      emailType: emailType,
      designAesthetic: designAesthetic,
      aestheticStyles: aestheticStyles
    };
    
    // Log MJML generation start time
    const mjmlStartTime = performance.now();
    console.log(`📝 Starting MJML generation (parallel to hero image)...`);
    
    const systemPrompt = `You are a vision-aware MJML generator.
Before writing MJML, study the example image(s) carefully and infer:
- layout sections (hero, grid, footer)
- proportions (padding, spacing)
- dominant color placement
Then design the MJML to mirror that structure while using the brand info and color palette from payload.brand.colors.
Must use brand colors.
Return ONLY raw MJML (no markdown fences, no explanations).
Do not copy exact colors from example image.
Include:
  • Hero section using the provided example image
  • Product/offer grid if payload.products exists
  • Footer using payload.brand.links/socials if present
Width <= 600px, mobile-first, accessible, valid MJML.

BRAND IMAGES:
- Logo: ${brandLogoUrl || 'none'} - Use in header or footer, maintain aspect ratio
- Banner: ${brandBannerUrl || 'none'} - use as a separation block near end of emails.
- Hero: ${heroImageUrl} - Main content image
- No text overlays on brand images


CRITICAL: MUST USE BRAND COLORS and the detected brand font "${essentialData.font}" throughout the entire email. This font was specifically detected from the brand's website and should be used consistently for all text elements including headings, body text, and buttons.

only return mjml no other text.
Output: Start with <mjml>, end with </mjml>. Max width 600px. Include header, hero section, products, footer.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate MJML email for ${essentialData.brandName}:\n${JSON.stringify(essentialData, null, 2)}`
          },
          ...(imagePart ? [imagePart] : [])
        ]
      }
    ];

    const model = process.env.OPENAI_MODEL_ID || "gpt-5-mini";
    console.log("🧠 Using model:", model);
    console.log("🔍 Essential data size:", JSON.stringify(essentialData).length, "characters");

    // Add timeout to prevent hanging requests - increased to 4 minutes for complex generations
    const timeoutMs = 240000; // 4 minutes timeout (was 2 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('GPT API request timeout after 4 minutes'));
      }, timeoutMs);
    });

    const resp = await Promise.race([
      openai.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 6000 // Reduced from 10000 to speed up generation
      }),
      timeoutPromise
    ]);

    const rawOutput = resp.choices?.[0]?.message?.content?.trim() || "";
    const usage = resp.usage || {};

    console.log("🔍 Raw output length:", rawOutput.length);
    console.log("🔍 Raw output first 500 chars:", rawOutput.substring(0, 500));
    console.log("🔍 Raw output last 200 chars:", rawOutput.substring(Math.max(0, rawOutput.length - 200)));
    
    // Check if output was truncated
    if (rawOutput.length >= 5990) {
      console.warn("⚠️ Output may have been truncated due to token limit");
    }

    // Check for empty output
    if (!rawOutput || rawOutput.length === 0) {
      console.error("❌ Model returned empty output");
      logEvent("❌ Model returned empty output - possible token limit issue");
      return res.status(400).type("text/plain").send("Model returned empty output. Try reducing payload size or increasing token limit.");
    }

    // Clean and validate MJML output
    const cleanedMjml = cleanMjmlOutput(rawOutput);

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const cost = inputTokens * INPUT_COST + outputTokens * OUTPUT_COST;
    const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);
    const mjmlElapsedSec = ((performance.now() - mjmlStartTime) / 1000).toFixed(2);
    
    console.log(`📝 MJML generation completed in ${mjmlElapsedSec}s`);

    // 🧾 Detailed log entry
    const scrapedInfo = enhancedPayload.scrapedStyles ? 
      ` | Scraped: ${enhancedPayload.scrapedStyles.primaryFont}` : '';
    logEvent(
      `✅ Generation complete in ${elapsedSec}s — Image: ${imageFile} (${layoutType})${scrapedInfo} | Input: ${inputTokens}, Output: ${outputTokens}, Total: ${totalTokens}, Cost: $${cost.toFixed(
        5
      )}`
    );

    if (!cleanedMjml.startsWith("<mjml")) {
      logEvent("⚠️ Model returned non-MJML output.");
      logEvent(`Raw output preview: ${rawOutput.substring(0, 200)}...`);
      return res.status(400).type("text/plain").send("Model did not return valid MJML.");
    }

    // Return MJML with actual image URL (or placeholder if generation failed)
    let finalMjml = cleanedMjml;
    
    // Wait for hero image generation to complete if it was started
    // This is the ONLY place we wait for hero image - everything else runs in parallel
    let finalHeroImageUrl = heroImageUrl;
    if (heroImagePromise) {
      const heroImageWaitStart = performance.now();
      console.log(`⏳ Waiting for hero image completion to inject URL into MJML...`);
      try {
        const imageResult = await heroImagePromise;
        const heroImageTotalTime = ((performance.now() - heroImageStartTime) / 1000).toFixed(2);
        const heroImageWaitTime = ((performance.now() - heroImageWaitStart) / 1000).toFixed(2);
        
        if (imageResult.success) {
          console.log(`✅ Hero image generation completed in ${heroImageTotalTime}s (waited ${heroImageWaitTime}s): ${imageResult.imageUrl}`);
          finalHeroImageUrl = imageResult.imageUrl;
          logEvent(`🎨 Hero image generated: ${imageResult.imageUrl} | Cost: $${imageResult.cost} | Uploaded to Supabase: true`);
          
          // Update the MJML with the actual image URL - replace placeholder
          const placeholderPattern = /https:\/\/via\.placeholder\.com[^"'\s]*/g;
          finalMjml = cleanedMjml.replace(placeholderPattern, finalHeroImageUrl);
          console.log(`🔄 Replaced placeholder with actual image URL in MJML`);
        } else {
          console.warn(`⚠️ Hero image generation failed: ${imageResult.error}`);
          logEvent(`⚠️ Hero image generation failed: ${imageResult.error}`);
        }
      } catch (error) {
        console.error(`❌ Hero image generation error:`, error.message);
        logEvent(`❌ Hero image generation error: ${error.message}`);
      }
    }
    
    // Update total cost
    const totalCost = cost;
    
    res.type("application/json").json({
      emails: [{
        content: finalMjml,
        subject: "", // Subject line will be generated by backend service
        preview: ""
      }],
      totalTokens: totalTokens,
      cost: cost,
      heroImageUrl: finalHeroImageUrl // Include the final hero image URL
    });
  } catch (err) {
    console.error("❌ Error:", err);
    logEvent(`❌ Error: ${err.message}`);
    
    // Return JSON error response instead of plain text
    res.status(500).json({
      error: err.message,
      type: 'generator_error',
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MJML generator running on http://localhost:${PORT}`);
  console.log(`→ POST /generate with your JSON payload`);
  console.log(`→ Logs saved in generation.log`);
});
