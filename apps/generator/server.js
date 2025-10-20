import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { scrapeWebsiteStyles, findClosestGoogleFont } from "./utils/websiteScraper.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3001;

// Cost constants (USD per 1M tokens for gpt-5-mini)
const INPUT_COST = 0.25 / 1_000_000;
const OUTPUT_COST = 2.00 / 1_000_000;


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
    "minimal-clean": "minimal_clean", // Handle variations
    "bold-contrasting": "bold_contrasting" // Handle variations
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

app.get("/health", (_, res) => res.json({ ok: true }));

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
    const designAesthetic = enhancedPayload.designAesthetic || enhancedPayload.brandData?.designAesthetic;
    
    console.log(`🔍 Extracted emailType: ${emailType}, designAesthetic: ${designAesthetic}`);
    
    // Pick image based on emailType and designAesthetic
    const { part: imagePart, filename: imageFile, layoutType } = pickExampleImage(emailType, designAesthetic);

    const systemPrompt = `Generate MJML email code only. No explanations.

Layout: ${layoutType} - Use example image structure, ignore colors/content.

Requirements:
- Brand colors: ${enhancedPayload.brandData?.primary_color || '#4f46e5'}, ${enhancedPayload.brandData?.link_color || '#22d3ee'}
- Brand image: ${enhancedPayload.brandData?.savedHeroImageUrl || 'none'}
- Brand name: ${enhancedPayload.brandData?.brand?.title || 'Brand'}
- Font: ${enhancedPayload.scrapedStyles?.primaryFont || 'Inter'}

Output: Start with <mjml>, end with </mjml>. Max width 600px. Include hero, products (if any), footer.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate brand-aware MJML using this payload:\n${JSON.stringify(enhancedPayload, null, 2)}`
          },
          ...(imagePart ? [imagePart] : [])
        ]
      }
    ];

    const model = process.env.OPENAI_MODEL_ID || "gpt-5";
    console.log("🧠 Using model:", model);

    const resp = await openai.chat.completions.create({
      model,
      messages,
        max_completion_tokens: 4000
    });

    const rawOutput = resp.choices?.[0]?.message?.content?.trim() || "";
    const usage = resp.usage || {};

    console.log("🔍 Raw output length:", rawOutput.length);
    console.log("🔍 Raw output first 500 chars:", rawOutput.substring(0, 500));
    console.log("🔍 Raw output last 200 chars:", rawOutput.substring(Math.max(0, rawOutput.length - 200)));
    
    // Check if output was truncated
    if (rawOutput.length >= 3990) {
      console.warn("⚠️ Output may have been truncated due to token limit");
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

    res.type("text/plain").send(cleanedMjml);
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
