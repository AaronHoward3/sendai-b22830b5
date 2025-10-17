import { generateMJMLFromExample } from '../services/exampleImageService.js';
import { generateCustomHeroImage } from '../services/heroImageService.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateEmailsController(req, res) {
  console.log('🎯 [GeneratorV2] Starting email generation');
  
  try {
    const {
      domain,
      emailType,
      designAesthetic,
      tone,
      userContext,
      imageContext,
      products = [],
      brandData = {},
      customHeroImage = true,
      savedHeroImageUrl = null
    } = req.body;

    // Validate required fields
    if (!domain || !emailType || !designAesthetic) {
      return res.status(400).json({ 
        error: 'Missing required fields: domain, emailType, designAesthetic' 
      });
    }

    console.log(`📧 Generating ${emailType} email for ${domain} with ${designAesthetic} design`);

    // Step 1: Generate MJML from example image
    const mjmlResult = await generateMJMLFromExample({
      emailType,
      designAesthetic,
      tone,
      userContext,
      imageContext,
      products,
      brandData,
      domain
    });

    if (!mjmlResult.success) {
      return res.status(500).json({ 
        error: 'Failed to generate MJML from example', 
        details: mjmlResult.error 
      });
    }

    let finalMjml = mjmlResult.mjml;
    let heroImageUrl = null;

    // Step 2: Handle custom hero image if requested
    if (customHeroImage && !savedHeroImageUrl) {
      console.log('🎨 Generating custom hero image...');
      
      const heroResult = await generateCustomHeroImage({
        brandData,
        imageContext,
        userContext,
        emailType,
        designAesthetic
      });

      if (heroResult.success) {
        heroImageUrl = heroResult.imageUrl;
        // Inject the custom hero image into the MJML
        finalMjml = injectHeroImage(finalMjml, heroImageUrl);
        console.log('✅ Custom hero image generated and injected');
      } else {
        console.log('⚠️ Custom hero generation failed, using placeholder');
      }
    } else if (savedHeroImageUrl) {
      // Use saved hero image
      heroImageUrl = savedHeroImageUrl;
      finalMjml = injectHeroImage(finalMjml, heroImageUrl);
      console.log('✅ Using saved hero image');
    }

    // Step 3: Return the generated email
    const response = {
      success: true,
      mjml: finalMjml,
      heroImageUrl,
      emailType,
      designAesthetic,
      domain,
      generatedAt: new Date().toISOString()
    };

    console.log('✅ Email generation completed successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ Email generation error:', error);
    res.status(500).json({ 
      error: 'Email generation failed', 
      details: error.message 
    });
  }
}

/**
 * Inject hero image URL into MJML
 */
function injectHeroImage(mjml, imageUrl) {
  if (!imageUrl) return mjml;
  
  // Replace placeholder with actual image URL
  return mjml
    .replace(/https:\/\/CUSTOMHEROIMAGE\.COM/g, imageUrl)
    .replace(/https:\/\/SAVEDHEROIMAGE\.COM/g, imageUrl)
    .replace(/https:\/\/PLACEHOLDERHERO\.COM/g, imageUrl);
}
