// src/services/heroImageService.js
import OpenAI from "openai";
import dotenv from "dotenv";
import { uploadImage } from "./imageUploadService.js";
import { countTokens } from "../utils/tokenizer.js";

// Load environment variables
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Non-negotiable rendering rules for hero images.
 * These are ALWAYS included in the final prompt sent to gpt-image-1
 * (regardless of whether we use a locally assembled prompt or a chat-generated idea).
 */
const INVARIANTS = `
STYLE & SUBJECT:
- High-quality editorial lifestyle hero photograph for promotional email
- Modern, brand-safe, cinematic quality with professional lighting
- Focus on people, environments, or products-in-use (no abstract concepts)
- Clean, aspirational lifestyle that appeals to target audience

COMPOSITION & SIZING:
- Wide aspect ratio optimized for email headers (16:9 or 3:1)
- Centered or rule-of-thirds composition for visual impact
- Leave lower third clean for text overlay and email transition
- Subtle bottom gradient or framing to blend into email body
- Ensure image works well at 600px width (standard email width)

STRICT NEGATIVES (MANDATORY):
- No text, lettering, signage, labels, symbols, wordmarks, or typography
- No brand logos or trademarks anywhere in the image
- No packaging, boxes, or products with visible labels
- No watermarks, copyright symbols, or promotional text
- No cluttered backgrounds that distract from main subject

COLOR & MOOD:
- Balanced, natural tones with single accent color
- Professional, aspirational mood that builds trust
- Good contrast for potential text overlay
- Colors that complement brand palette when specified
`.trim();

/**
 * Assemble the final image prompt: brand specifics + invariants + a concise creative focus line.
 * This guarantees our strict "no text/logos/labels" rules are always present.
 */
function assemblePrompt({
  brandDesc,
  audience,
  primaryColor,
  extraGuidance,
  creativeFocus // short creative idea, may be empty
}) {
  const colorLine = primaryColor
    ? `Color: incorporate the primary brand color ${primaryColor} subtly as an accent`
    : `Color: use balanced, neutral tones with a single accent`;

  const parts = [
    `Subject/brand: ${brandDesc}`,
    `Audience: ${audience}`,
    colorLine,
    INVARIANTS,
    creativeFocus ? `CREATIVE FOCUS (brief): ${creativeFocus}` : null,
    extraGuidance ? `EXTRA GUIDANCE: ${extraGuidance}` : null
  ].filter(Boolean);

  return parts.join("\n");
}

/** Extract brand basics used for prompt assembly */
function extractBrandBits(brandData) {
  const brandDesc =
    brandData?.description ||
    brandData?.brand_summary ||
    brandData?.store_name ||
    "Modern ecommerce lifestyle brand";

  const primaryColor =
    Array.isArray(brandData?.colors) && brandData.colors.length
      ? brandData.colors[0]
      : null;

  const audience = brandData?.audience || "broad DTC audience";
  const extraGuidance = (brandData?.imageContext || "").toString().slice(0, 400);

  return { brandDesc, primaryColor, audience, extraGuidance };
}

/** Local fallback: build a complete, invariant-safe prompt with no chat calls */
function buildLocalPrompt(brandData) {
  const { brandDesc, primaryColor, audience, extraGuidance } = extractBrandBits(brandData);
  return assemblePrompt({
    brandDesc,
    primaryColor,
    audience,
    extraGuidance,
    creativeFocus: "" // none
  });
}

/**
 * Ask Chat Completions for a SHORT creative angle (one sentence),
 * but we will ALWAYS wrap it with our invariant template before sending to gpt-image-1.
 */
async function createCreativeFocusViaChat(brandData, model) {
  const { brandDesc, primaryColor, audience, extraGuidance } = extractBrandBits(brandData);

  const sys = `
You are a senior creative director specializing in high-conversion email marketing imagery.
Generate ONE compelling, specific photography concept for an email hero image that will drive engagement.
Focus on lifestyle, emotion, and aspirational moments that connect with the target audience.
Output only a single vivid sentence (max 20 words) describing the scene, mood, or moment.
Never mention text overlays, logos, watermarks, labels, or typography.
`.trim();

  const user = `
Brand: ${brandDesc}
Target Audience: ${audience}
Brand Color: ${primaryColor || "neutral palette"}
Context: ${extraGuidance || "general promotional email"}

Create a specific, engaging photography concept that would work as a hero image for this brand's promotional email.
Think about the lifestyle, emotions, and moments that would resonate with ${audience}.
Focus on authentic, aspirational scenes that build trust and desire.

Return only the single-line creative concept (max 20 words).
`.trim();

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 60,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ]
  });

  const line = resp.choices?.[0]?.message?.content?.trim() || "";
  return { creativeFocus: line, resp };
}

/** Price table fallback when Images API doesn't return usage */
function fallbackImagePriceUSD({ size = "1024x1536", quality = "high" }) {
  const table = {
    low:    { "1024x1024": 0.011, "1024x1536": 0.016, "1536x1024": 0.016 },
    medium: { "1024x1024": 0.042, "1024x1536": 0.063, "1536x1024": 0.063 },
    high:   { "1024x1024": 0.167, "1024x1536": 0.25,  "1536x1024": 0.25  }
  };
  return table[quality]?.[size] ?? 0.17;
}

export async function generateCustomHeroImage({
  brandData,
  imageContext,
  userContext,
  emailType,
  designAesthetic
}) {
  try {
    console.log('🎨 Generating custom hero image...');

    // Extract brand information for the original generator format
    const brandName = brandData?.brand?.title || brandData?.name || 'Brand';
    const brandDescription = brandData?.brand?.description || brandData?.description || '';
    const primaryColor = brandData?.brand?.colors?.[0]?.hex || brandData?.primary_color || '#000000';

    // Convert to the format expected by the original generator
    const generatorBrandData = {
      description: brandDescription,
      store_name: brandName,
      colors: [{ hex: primaryColor }],
      audience: "broad DTC audience",
      imageContext: imageContext || '',
      userContext: userContext || ''
    };

    let storeSlug = brandName?.toLowerCase().replace(/\s+/g, "-") || "custom-brand";
    storeSlug = storeSlug.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

    const promptModel = process.env.HERO_PROMPT_MODEL || "gpt-3.5-turbo";
    const size = "1024x1536";
    const quality = "high";

    // 1) Get a short creative angle via chat (official usage), then wrap with invariants
    let creativeFocus = "";
    try {
      const { creativeFocus: line, resp } = await createCreativeFocusViaChat(generatorBrandData, promptModel);
      creativeFocus = line;
    } catch (err) {
      console.warn(`⚠️ Image prompt via chat failed (${err.message}). Falling back to local prompt.`);
    }

    const { brandDesc, primaryColor: extractedColor, audience, extraGuidance } = extractBrandBits(generatorBrandData);
    const promptText = creativeFocus
      ? assemblePrompt({ brandDesc, primaryColor: extractedColor, audience, extraGuidance, creativeFocus })
      : buildLocalPrompt(generatorBrandData);

    // (Optional) log final prompt for QA
    if (process.env.EG_LOG_IMAGE_PROMPT === "1") {
      console.log("Image prompt (sanitized)", promptText.slice(0, 700));
    }

    // Local token visibility (not for billing)
    try {
      const imgPromptTokens = await countTokens(promptText);
      console.log("Image prompt tokens:", imgPromptTokens);
    } catch {}

    // 2) Generate the image
    console.log(`[GEN] Starting image generation...`);
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: promptText,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });
    console.log(`[GEN] Image generation completed`);

    // For DALL-E 3, we get a URL directly
    const imageUrl = imageResponse.data[0].url;
    
    // Download the image and upload to our storage
    const response = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // 3) Upload and return URLs
    console.log(`[GEN] Starting image upload...`);
    
    // Validate that we have a real generated image, not a placeholder
    if (!imageBuffer || imageBuffer.length < 1000) {
      console.error(`❌ Invalid image data - image too small or empty`);
      throw new Error("Invalid image data generated");
    }
    
    const randomHash =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const filename = `hero-${randomHash}.png`;

    // Add timeout to upload process
    const uploadPromise = uploadImage(imageBuffer, filename, storeSlug);
    const uploadTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Image upload timeout")), 30000) // 30s timeout for upload
    );
    
    const publicUrl = await Promise.race([uploadPromise, uploadTimeout]);
    
    // Final validation: ensure the uploaded URL is not a placeholder
    if (publicUrl && publicUrl.includes("masxzswlivypqantomhc.supabase.co")) {
      console.error(`❌ Uploaded image appears to be placeholder: ${publicUrl}`);
      throw new Error("Uploaded image is placeholder, not generated image");
    }
    
    console.log(`[GEN] Image upload completed: ${publicUrl}`);

    return {
      success: true,
      imageUrl: publicUrl
    };

  } catch (error) {
    console.error(`❌ Hero image generation failed:`, error.message);
    
    // If it's an upload timeout, we still have the generated image, just couldn't upload it
    if (error.message.includes("upload timeout")) {
      console.warn(`⚠️ Image generated but upload failed. Using fallback.`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}