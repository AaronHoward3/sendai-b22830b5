import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate AI-powered, digestible user context and image context
 * This replaces the basic template-based context generation with AI-generated content
 */
export async function generateAIContext(req, res) {
  console.log("🤖 [CONTEXT] Starting AI context generation");
  
  try {
    const {
      brandData = {},
      emailType = "Promotion",
      tone = "bold",
      designAesthetic = "bold_contrasting",
      products = [],
      occasion = "general",
      domain = ""
    } = req.body || {};

    console.log("🤖 [CONTEXT] Request data:", {
      emailType,
      tone,
      designAesthetic,
      hasProducts: products.length > 0,
      domain
    });

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Extract brand information
    const brandName = brandData?.name || brandData?.brandData?.name || domain;
    const brandDesc = brandData?.description || brandData?.brandData?.description || "";
    const brandPrimary = brandData?.primary_color || brandData?.brandData?.primary_color;
    const brandLink = brandData?.link_color || brandData?.brandData?.link_color;

    // Prepare product information
    const productNames = products
      .map(p => p?.name?.trim())
      .filter(Boolean)
      .slice(0, 3); // Limit to top 3 products

    // Generate user context
    const userContextPrompt = `
You are a marketing copywriter creating email context for ${brandName}.

BRAND INFO:
- Name: ${brandName}
- Description: ${brandDesc || "No description available"}
- Email Type: ${emailType}
- Tone: ${tone}
- Design Style: ${designAesthetic}
- Products: ${productNames.length > 0 ? productNames.join(", ") : "No specific products"}
- Occasion: ${occasion}

TASK: Write a concise, human-readable context (2-3 sentences max) that explains:
1. What this email is about
2. The brand's value proposition
3. What makes this offer/update special

Make it sound natural and engaging, not like a template. Focus on the human benefit and brand personality.

Return ONLY the context text, nothing else.
`.trim();

    // Generate image context
    const imageContextPrompt = `
You are a visual designer creating image prompts for ${brandName}.

BRAND INFO:
- Name: ${brandName}
- Description: ${brandDesc || "No description available"}
- Primary Color: ${brandPrimary || "Not specified"}
- Link Color: ${brandLink || "Not specified"}
- Design Style: ${designAesthetic}
- Products: ${productNames.length > 0 ? productNames.join(", ") : "No specific products"}
- Occasion: ${occasion}

TASK: Write a visual image prompt (2-3 sentences max) that describes:
1. The visual style and mood
2. Key visual elements (colors, composition, style)
3. What the image should convey about the brand

Make it specific and visual. Focus on what the image should look like, not what text should be on it.

Return ONLY the image prompt text, nothing else.
`.trim();

    // Generate both contexts in parallel
    const [userContextResponse, imageContextResponse] = await Promise.all([
      openai.chat.completions.create({
        model: process.env.CONTEXT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: "system", content: "You are a skilled marketing copywriter who creates engaging, human-readable content." },
          { role: "user", content: userContextPrompt }
        ]
      }),
      openai.chat.completions.create({
        model: process.env.CONTEXT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: "system", content: "You are a visual designer who creates detailed image prompts for marketing materials." },
          { role: "user", content: imageContextPrompt }
        ]
      })
    ]);

    const userContext = userContextResponse.choices?.[0]?.message?.content?.trim() || "";
    const imageContext = imageContextResponse.choices?.[0]?.message?.content?.trim() || "";

    console.log("🤖 [CONTEXT] Generated contexts:", {
      userContextLength: userContext.length,
      imageContextLength: imageContext.length
    });

    res.json({
      success: true,
      userContext,
      imageContext,
      usage: {
        userContextTokens: userContextResponse.usage?.total_tokens || 0,
        imageContextTokens: imageContextResponse.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error("❌ [CONTEXT] Error generating AI context:", error);
    res.status(500).json({ 
      error: "Failed to generate AI context",
      details: error.message 
    });
  }
}
