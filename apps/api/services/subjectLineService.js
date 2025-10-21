import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a compelling subject line based on user context
 * @param {string} userContext - The user context describing the email content
 * @param {string} brandName - The brand name
 * @param {string} emailType - 'Promotion' or 'Newsletter'
 * @param {string} tone - 'bold', 'friendly', 'formal', 'fun'
 * @returns {Promise<string>} Generated subject line
 */
export async function generateSubjectLine(userContext, brandName, emailType = 'Promotion', tone = 'bold') {
  try {
    console.log("📧 [SUBJECT] Generating subject line for:", { brandName, emailType, tone });
    console.log("📧 [SUBJECT] User context:", userContext?.substring(0, 100) + "...");

    if (!userContext || userContext.trim().length === 0) {
      console.warn("📧 [SUBJECT] No user context provided, using fallback");
      return `${emailType === 'Newsletter' ? 'Update' : 'Special Offer'} from ${brandName}`;
    }

    const prompt = `You are a skilled email marketing copywriter creating compelling subject lines.

USER CONTEXT: "${userContext}"

BRAND: ${brandName}
EMAIL TYPE: ${emailType}
TONE: ${tone}

TASK: Create a compelling email subject line that:
1. Captures the essence and value from the user context
2. Reflects the specified tone (${tone})
3. Encourages opens without being spammy
4. Is under 60 characters
5. Focuses on the main benefit or offer mentioned in the context

EXAMPLES:
- If context mentions "discount" → "Save 20% on Premium Headphones"
- If context mentions "new product" → "Introducing Our Latest Innovation"
- If context mentions "limited time" → "Don't Miss This Limited Offer"
- If context mentions "exclusive" → "Exclusive Access Just for You"

Return ONLY the subject line text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: process.env.CONTEXT_MODEL || "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert email marketing copywriter who creates compelling subject lines that drive high open rates. Focus on the value proposition and urgency from the context." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.8,
    });

    const subjectLine = response.choices?.[0]?.message?.content?.trim() || "";
    
    // Clean up the subject line
    const cleanedSubjectLine = subjectLine
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Subject:\s*/i, '') // Remove "Subject:" prefix if present
      .trim();

    console.log("📧 [SUBJECT] Generated:", cleanedSubjectLine);
    
    // Fallback if generated subject line is too long or empty
    if (!cleanedSubjectLine || cleanedSubjectLine.length > 60) {
      console.warn("📧 [SUBJECT] Generated subject line too long or empty, using fallback");
      return `${emailType === 'Newsletter' ? 'Update' : 'Special Offer'} from ${brandName}`;
    }

    return cleanedSubjectLine;

  } catch (error) {
    console.error("📧 [SUBJECT] Error generating subject line:", error);
    return `${emailType === 'Newsletter' ? 'Update' : 'Special Offer'} from ${brandName}`;
  }
}

/**
 * Generate subject line for preview mode (no AI)
 * @param {string} userContext - The user context
 * @param {string} brandName - The brand name
 * @param {string} emailType - 'Promotion' or 'Newsletter'
 * @returns {string} Fallback subject line
 */
export function generatePreviewSubjectLine(userContext, brandName, emailType = 'Promotion') {
  // Simple keyword-based subject line generation for preview mode
  const context = userContext.toLowerCase();
  
  if (context.includes('discount') || context.includes('save') || context.includes('off')) {
    return `Save Big at ${brandName}`;
  }
  if (context.includes('new') || context.includes('launch') || context.includes('introducing')) {
    return `New from ${brandName}`;
  }
  if (context.includes('limited') || context.includes('exclusive')) {
    return `Limited Time at ${brandName}`;
  }
  if (context.includes('sale') || context.includes('deal')) {
    return `Special Deal at ${brandName}`;
  }
  
  return `${emailType === 'Newsletter' ? 'Update' : 'Special Offer'} from ${brandName}`;
}
