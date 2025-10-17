import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Example image storage paths
const EXAMPLE_IMAGES_PATH = path.join(__dirname, '../../examples');
const DESIGN_AESTHETICS = {
  'minimal_clean': 'minimal-clean',
  'bold_contrasting': 'bold-contrasting', 
  'magazine_serif': 'magazine-serif',
  'warm_editorial': 'warm-editorial',
  'default': 'default'
};

/**
 * Generate MJML from example image using OpenAI Vision
 */
export async function generateMJMLFromExample({
  emailType,
  designAesthetic,
  tone,
  userContext,
  imageContext,
  products,
  brandData,
  domain
}) {
  try {
    console.log(`🖼️ Selecting example image for ${designAesthetic} design`);
    
    // Step 1: Select random example image
    const exampleImagePath = await selectRandomExampleImage(designAesthetic, emailType);
    if (!exampleImagePath) {
      return { 
        success: false, 
        error: `No example images found for ${designAesthetic} design` 
      };
    }

    console.log(`📸 Using example image: ${path.basename(exampleImagePath)}`);

    // Step 2: Read the example image
    const imageBuffer = await fs.readFile(exampleImagePath);
    const base64Image = imageBuffer.toString('base64');

    // Step 3: Build the prompt
    const prompt = buildMJMLGenerationPrompt({
      emailType,
      designAesthetic,
      tone,
      userContext,
      imageContext,
      products,
      brandData,
      domain
    });

    // Step 4: Generate MJML using OpenAI Vision
    console.log('🤖 Generating MJML using OpenAI Vision...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    });

    const generatedMjml = response.choices[0].message.content;
    
    // Step 5: Clean and validate MJML
    const cleanedMjml = cleanMJML(generatedMjml);
    
    console.log('✅ MJML generated successfully');
    return {
      success: true,
      mjml: cleanedMjml,
      exampleImage: path.basename(exampleImagePath)
    };

  } catch (error) {
    console.error('❌ MJML generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Select a random example image for the given design aesthetic and email type
 */
async function selectRandomExampleImage(designAesthetic, emailType) {
  try {
    const aestheticFolder = DESIGN_AESTHETICS[designAesthetic] || DESIGN_AESTHETICS.default;
    const examplesPath = path.join(EXAMPLE_IMAGES_PATH, aestheticFolder, emailType.toLowerCase());
    
    console.log(`🔍 Looking for examples in: ${examplesPath}`);
    console.log(`🔍 Base examples path: ${EXAMPLE_IMAGES_PATH}`);
    console.log(`🔍 Aesthetic folder: ${aestheticFolder}`);
    
    // Check if the specific email type folder exists
    if (!(await fs.pathExists(examplesPath))) {
      console.log(`⚠️ Email type folder not found, falling back to aesthetic folder`);
      // Fallback to general aesthetic folder
      const fallbackPath = path.join(EXAMPLE_IMAGES_PATH, aestheticFolder);
      console.log(`🔍 Fallback path: ${fallbackPath}`);
      
      if (await fs.pathExists(fallbackPath)) {
        const files = await fs.readdir(fallbackPath);
        console.log(`📁 Files in fallback folder:`, files);
        const imageFiles = files.filter(file => 
          file.toLowerCase().endsWith('.png') || 
          file.toLowerCase().endsWith('.jpg') ||
          file.toLowerCase().endsWith('.jpeg')
        );
        
        console.log(`🖼️ Image files found:`, imageFiles);
        
        if (imageFiles.length > 0) {
          const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
          const fullPath = path.join(fallbackPath, randomFile);
          console.log(`✅ Selected image: ${fullPath}`);
          return fullPath;
        }
      } else {
        console.log(`❌ Fallback path does not exist: ${fallbackPath}`);
      }
      return null;
    }

    const files = await fs.readdir(examplesPath);
    const imageFiles = files.filter(file => 
      file.toLowerCase().endsWith('.png') || 
      file.toLowerCase().endsWith('.jpg') ||
      file.toLowerCase().endsWith('.jpeg')
    );

    if (imageFiles.length === 0) {
      return null;
    }

    const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    return path.join(examplesPath, randomFile);

  } catch (error) {
    console.error('Error selecting example image:', error);
    return null;
  }
}

/**
 * Build the prompt for MJML generation
 */
function buildMJMLGenerationPrompt({
  emailType,
  designAesthetic,
  tone,
  userContext,
  imageContext,
  products,
  brandData,
  domain
}) {
  const brandName = brandData?.brand?.title || brandData?.name || domain;
  const brandDescription = brandData?.brand?.description || brandData?.description || '';
  const primaryColor = brandData?.brand?.colors?.[0]?.hex || brandData?.primary_color || '#000000';
  const linkColor = brandData?.brand?.colors?.[1]?.hex || brandData?.link_color || '#0066cc';

  return `You are an expert email designer. I'm showing you an example email template image. Please generate clean, valid MJML code that recreates this design with the following specifications:

BRAND INFORMATION:
- Brand Name: ${brandName}
- Domain: ${domain}
- Description: ${brandDescription}
- Primary Color: ${primaryColor}
- Link Color: ${linkColor}

EMAIL SPECIFICATIONS:
- Email Type: ${emailType}
- Design Aesthetic: ${designAesthetic}
- Tone: ${tone}
- User Context: ${userContext || 'General promotion'}
- Image Context: ${imageContext || 'Professional lifestyle'}

PRODUCTS TO INCLUDE:
${products.slice(0, 3).map((product, index) => `
Product ${index + 1}:
- Title: ${product.title || 'Product'}
- Description: ${product.subtitle || product.description || ''}
- Price: ${product.price || ''}
- Image URL: ${product.imageUrl || 'https://via.placeholder.com/300x300'}
- Button URL: ${product.buttonUrl || product.url || '#'}
`).join('')}

REQUIREMENTS:
1. Generate clean, valid MJML code that matches the visual design in the image
2. Use the brand colors provided
3. Include the products listed above
4. Make sure all text content is relevant to the brand and context
5. Use placeholder URLs like https://CUSTOMHEROIMAGE.COM for hero images
6. Ensure responsive design with proper MJML structure
7. Include proper email headers and footers
8. Use semantic HTML structure within MJML

Please return ONLY the MJML code, no explanations or markdown formatting.`;
}

/**
 * Clean and validate the generated MJML
 */
function cleanMJML(mjml) {
  // Remove any markdown formatting
  let cleaned = mjml
    .replace(/```mjml\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/```html\n?/g, '')
    .trim();

  // Ensure it starts with <mjml> and ends with </mjml>
  if (!cleaned.startsWith('<mjml')) {
    cleaned = '<mjml>\n' + cleaned;
  }
  if (!cleaned.endsWith('</mjml>')) {
    cleaned = cleaned + '\n</mjml>';
  }

  return cleaned;
}
