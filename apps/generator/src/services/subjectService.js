import OpenAI from "openai";
import { countTokens } from "../utils/tokenizer.js";

// Import the processUserContext function
function processUserContext(userContext, brandData, emailType) {
  if (!userContext || typeof userContext !== 'string') {
    return emailType?.toLowerCase() === "newsletter" ? "newsletter" : "promotion";
  }
  
  const context = userContext.toLowerCase().trim();
  const brandName = (brandData?.name || brandData?.brandData?.name || "").toLowerCase();
  
  // Extract only the most essential concepts - keep it very concise
  const concepts = [];
  
  // Urgency indicators
  if (/urgent|limited|expires|deadline|flash|quick|now|today|tomorrow|hurry/i.test(context)) {
    concepts.push("urgent");
  }
  
  // Sale/discount indicators
  if (/sale|discount|off|save|deal|special|promo|clearance/i.test(context)) {
    concepts.push("sale");
  }
  
  // Product categories
  if (/new|launch|arrival|collection|seasonal/i.test(context)) {
    concepts.push("new");
  }
  
  // Content type
  if (/story|journey|behind|process|how|why|experience/i.test(context)) {
    concepts.push("story");
  }
  
  if (/testimonial|review|customer|love|recommend|trust/i.test(context)) {
    concepts.push("social");
  }
  
  if (/tip|advice|guide|tutorial|how-to|educational/i.test(context)) {
    concepts.push("educational");
  }
  
  // Brand personality (simplified)
  if (/luxury|premium|exclusive|elite|high-end/i.test(brandName + " " + context)) {
    concepts.push("luxury");
  }
  
  if (/tech|digital|app|software|innovation/i.test(brandName + " " + context)) {
    concepts.push("tech");
  }
  
  if (/fashion|style|trend|design|aesthetic/i.test(brandName + " " + context)) {
    concepts.push("fashion");
  }
  
  // Fallback - keep it minimal
  if (concepts.length === 0) {
    return emailType?.toLowerCase() === "newsletter" ? "newsletter" : "promotion";
  }
  
  // Return only the first 3 concepts to keep it concise
  return concepts.slice(0, 3).join(", ");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a single compelling subject line (<= 60 chars).
 * Adds official usage + local counts to metrics.
 */
export async function generateSubjectLine({
  brandData = {},
  emailType = "Promotion",
  designAesthetic = "bold_contrasting",
  userContext = "",
  refinedMjml = "",
  metrics,
}) {
  const sys = `
You are a marketing copywriter. Write ONE compelling email subject line.
- Max 60 characters
- No emojis unless the tone clearly warrants it
- No spammy all caps
- Match the brand tone and the email type
Return ONLY the subject line text, nothing else.
`.trim();

  // Process user context to make it concise
  const processedContext = processUserContext(userContext, brandData, emailType);
  
  const user = `
brandData: ${JSON.stringify(brandData).slice(0, 2000)}
emailType: ${emailType}
designAesthetic: ${designAesthetic}
contentFocus: ${processedContext}
contentHint (optional, may be empty): ${refinedMjml ? refinedMjml.slice(0, 1000) : ""}
`.trim();

  try {
    // local count for prompt
    try {
      const inTokens = await countTokens(`${sys}\n\n${user}`);
      metrics?.addLocalUsage?.({ input: inTokens });
    } catch {}

    metrics?.start?.("subjectLine");
    const resp = await openai.chat.completions.create({
      model: process.env.SUBJECTLINE_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 50,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });
    metrics?.end?.("subjectLine");

    // official usage
    metrics?.addUsageFromResponse?.(resp);

    const text = resp.choices?.[0]?.message?.content?.trim();
    const subject = (text || "").replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 120);

    // local count for output
    try {
      const outTokens = await countTokens(subject);
      metrics?.addLocalUsage?.({ output: outTokens });
    } catch {}

    metrics?.log?.("Subject line generated:", subject);
    return subject;
  } catch (e) {
    console.warn("Subject line generation failed:", e.message);
    const name = brandData?.store_name || brandData?.name || "Your brand";
    return `${name}: New picks inside`;
  }
}
