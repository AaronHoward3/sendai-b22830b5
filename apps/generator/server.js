import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';
import { scrapeWebsiteStyles, findClosestGoogleFont } from "./utils/websiteScraper.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3001;

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
      .substring(0, 100) // Limit length
      .trim();
  }

  const brandPart = brandName ? `featuring ${brandName} branding` : '';
  
  return `${basePrompt}, ${brandPart}${safeContext ? `, ${safeContext}` : ''}, professional photography style, high quality, marketing appropriate`.trim();
}

// 🖼️ Generate image using DALL-E
async function generateHeroImage(prompt, brandId) {
  try {
    console.log(`🎨 Generating image with prompt: ${prompt}`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0].url;
    console.log(`✅ Image generated: ${imageUrl}`);
    
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
    // Download image from OpenAI
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
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
async function generateAndUploadHeroImage(imageContext, brandData, emailType, designAesthetic, shouldUploadToSupabase = true) {
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
  
  // Only upload to Supabase if explicitly requested (for newly generated images)
  if (shouldUploadToSupabase) {
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
  } else {
    // Return the OpenAI URL directly without uploading to Supabase
    console.log(`🎨 Generated image URL (not uploaded to Supabase): ${imageResult.imageUrl}`);
    return { 
      success: true, 
      imageUrl: imageResult.imageUrl,
      prompt: imageResult.prompt,
      cost: IMAGE_COST
    };
  }
}

// 🎨 Get design aesthetic specific styling
function getDesignAestheticStyles(designAesthetic) {
  const styles = {
    minimal_clean: {
      sectionPadding: "20px 0px",
      columnPadding: "10px",
      elementSpacing: "15px",
      lineHeight: "1.6",
      headingFontSize: "28px",
      headingFontWeight: "700",
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
      headingFontSize: "32px",
      headingFontWeight: "800",
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
      headingFontSize: "30px",
      headingFontWeight: "300",
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
  try {
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

    console.log(`🔍 Scraping website styles for: ${domain} (timeout: ${timeoutMs}ms)`);
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Website scraping timeout')), timeoutMs);
    });
    
    // Race between scraping and timeout
    const scrapedData = await Promise.race([
      scrapeWebsiteStyles(domain),
      timeoutPromise
    ]);
    
    if (scrapedData.success) {
      // Find closest Google Font
      const primaryFont = scrapedData.fonts[0];
      const closestGoogleFont = findClosestGoogleFont(primaryFont);
      
      // Enhance payload with scraped data
      const enhancedPayload = {
        ...payload,
        scrapedStyles: {
          fonts: scrapedData.fonts,
          primaryFont: closestGoogleFont,
          buttonStyles: scrapedData.buttonStyles,
          scrapedAt: new Date().toISOString(),
          source: scrapedData.url
        }
      };
      
      console.log(`✅ Scraped styles: Fonts: ${scrapedData.fonts.join(', ')}, Primary: ${closestGoogleFont}`);
      return enhancedPayload;
    } else {
      console.log(`⚠️ Website scraping failed for ${domain}: ${scrapedData.error}`);
      return payload;
    }
  } catch (error) {
    console.error(`❌ Error enhancing payload with website styles:`, error.message);
    if (error.message === 'Website scraping timeout') {
      console.log(`⏰ Website scraping timed out after ${timeoutMs}ms, continuing without scraped styles`);
    }
    return payload;
  }
}

app.get("/healthz", (_, res) => res.json({ ok: true }));

// POST /generate  -> returns raw MJML
app.post("/generate", async (req, res) => {
  const startTime = performance.now();

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
    
    // Generate hero image synchronously if needed
    if (useCustomHeroImage && imageContext) {
      console.log(`🎨 Starting hero image generation...`);
      console.log(`🎨 Image context: ${imageContext.substring(0, 100)}...`);
      console.log(`🎨 Use custom hero image: ${useCustomHeroImage}`);
      
      try {
        // CRITICAL: Only upload to Supabase if useCustomHeroImage is true (newly generated images only)
        // No other images (logos, banners, products, etc.) should ever be uploaded to Supabase
        const shouldUploadToSupabase = useCustomHeroImage === true;
        const imageResult = await generateAndUploadHeroImage(
          imageContext, 
          enhancedPayload.brandData, 
          emailType, 
          designAesthetic,
          shouldUploadToSupabase
        );
        
        if (imageResult.success) {
          console.log(`✅ Hero image generated: ${imageResult.imageUrl}`);
          heroImageUrl = imageResult.imageUrl; // Use the actual generated image URL
          logEvent(`🎨 Hero image generated: ${imageResult.imageUrl} | Cost: $${imageResult.cost} | Uploaded to Supabase: ${shouldUploadToSupabase}`);
        } else {
          console.warn(`⚠️ Hero image generation failed: ${imageResult.error}`);
          logEvent(`⚠️ Hero image generation failed: ${imageResult.error}`);
          // Keep using placeholder if generation fails
        }
      } catch (error) {
        console.error(`❌ Hero image generation error:`, error.message);
        logEvent(`❌ Hero image generation error: ${error.message}`);
        // Keep using placeholder if generation fails
      }
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
    
    const systemPrompt = `Generate unique MJML email code only. No explanations.

Layout: ${layoutType} - Use example image structure, and use the color weights (not exact colors from examples, just the general application of them). Style: ${randomLayout} approach.

CRITICAL SPACING & LAYOUT REQUIREMENTS:
- Use proper mj-section padding: ${aestheticStyles.sectionPadding}
- Use proper mj-column padding: ${aestheticStyles.columnPadding}
- Ensure adequate spacing between elements: ${aestheticStyles.elementSpacing}
- Use proper line-height: ${aestheticStyles.lineHeight}
- Ensure images have proper margins and don't overlap text
- Use mj-spacer elements for consistent vertical spacing
- All text must be readable with proper contrast
- Do NOT use emojis.
- Must be mobile friendly.

BRAND IMAGES REQUIREMENTS:
- Brand logo: ${brandLogoUrl || 'none'} - Use in header if available, maintain aspect ratio, no text overlays
- Brand banner: ${brandBannerUrl || 'none'} - Use as background or hero section if available, maintain aspect ratio, no text overlays
- Hero image: ${heroImageUrl} - Use as main content image
- CRITICAL: Brand logos and banners must maintain their original aspect ratios
- CRITICAL: No text, buttons, or other elements should overlay brand logos or banners
- Use mj-image with proper width/height attributes to preserve aspect ratios

DESIGN AESTHETIC: ${designAesthetic.toUpperCase()}
Typography:
- Headings: ${aestheticStyles.headingFontSize}, ${aestheticStyles.headingFontWeight}
- Body text: ${aestheticStyles.bodyFontSize}, ${aestheticStyles.bodyFontWeight}
- Button text: ${aestheticStyles.buttonFontSize}, ${aestheticStyles.buttonFontWeight}

Requirements:
- Brand colors: ${enhancedPayload.brandData?.primary_color || '#4f46e5'}, ${enhancedPayload.brandData?.link_color || '#22d3ee'}
- Brand name: ${enhancedPayload.brandData?.brand?.title || 'Brand'}
- Font: ${enhancedPayload.scrapedStyles?.primaryFont || 'Inter'}
- Random seed: ${randomSeed}

Output: Start with <mjml>, end with </mjml>. Max width 600px. Include header with logo (if available), hero/banner section, products (if any), footer. Create unique layout variations.`;

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

    const model = process.env.OPENAI_MODEL_ID || "gpt-5";
    console.log("🧠 Using model:", model);
    console.log("🔍 Essential data size:", JSON.stringify(essentialData).length, "characters");

    const resp = await openai.chat.completions.create({
      model,
      messages,
      max_completion_tokens: 10000
    });

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
    
    // Update total cost
    const totalCost = cost;
    
    res.type("application/json").json({
      emails: [{
        content: finalMjml,
        subject: "", // Subject line will be generated by backend service
        preview: ""
      }],
      totalTokens: totalTokens,
      cost: cost
    });
  } catch (err) {
    console.error("❌ Error:", err);
    logEvent(`❌ Error: ${err.message}`);
    res.status(500).type("text/plain").send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MJML generator running on http://localhost:${PORT}`);
  console.log(`→ POST /generate with your JSON payload`);
  console.log(`→ Logs saved in generation.log`);
});
