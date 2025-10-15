// upload-placeholder-images.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_IMAGES_BUCKET || "image-hosting-braanddev";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { "x-application-name": "placeholder-uploader" } },
});

// Create SVG placeholder images
function createPlaceholderSVG(width, height, text, backgroundColor = '#f3f4f6', textColor = '#9b9ba0') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="500" fill="${textColor}">${text}</text>
</svg>`;
}

// Convert SVG to PNG buffer (simplified - in production you might want to use a proper SVG to PNG converter)
function svgToPngBuffer(svgString) {
  // For now, we'll upload as SVG directly
  // In a production environment, you might want to use a library like sharp or puppeteer to convert SVG to PNG
  return Buffer.from(svgString, 'utf-8');
}

async function ensureBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    if (error && (error.message || "").toLowerCase().includes("not found")) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "20MB",
      });
      if (createErr) throw createErr;
      console.log(`✅ Storage bucket created: ${BUCKET}`);
    } else {
      console.log(`✅ Storage bucket exists: ${BUCKET}`);
    }
  } catch (e) {
    console.warn(`⚠️ Bucket check warning:`, e?.message || e);
  }
}

async function uploadPlaceholderImage(svgString, filename) {
  const buffer = svgToPngBuffer(svgString);
  const key = `placeholders/${filename}`;
  
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, {
      contentType: 'image/svg+xml',
      upsert: true,
      cacheControl: "31536000",
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return pub?.publicUrl;
}

async function main() {
  console.log('🚀 Starting placeholder image upload...');
  
  try {
    await ensureBucket();
    
    // Create different placeholder images
    const placeholders = [
      {
        name: 'product-placeholder.svg',
        svg: createPlaceholderSVG(300, 300, 'PRODUCT IMAGE'),
        description: 'Product placeholder (300x300)'
      },
      {
        name: 'hero-placeholder.svg', 
        svg: createPlaceholderSVG(600, 400, 'HERO IMAGE'),
        description: 'Hero placeholder (600x400)'
      },
      {
        name: 'product-placeholder-small.svg',
        svg: createPlaceholderSVG(150, 150, 'PRODUCT'),
        description: 'Small product placeholder (150x150)'
      }
    ];
    
    const uploadedUrls = {};
    
    for (const placeholder of placeholders) {
      console.log(`📤 Uploading ${placeholder.description}...`);
      const url = await uploadPlaceholderImage(placeholder.svg, placeholder.name);
      uploadedUrls[placeholder.name] = url;
      console.log(`✅ Uploaded: ${url}`);
    }
    
    // Save URLs to a config file
    const configPath = path.join(process.cwd(), 'placeholder-images-config.json');
    fs.writeFileSync(configPath, JSON.stringify(uploadedUrls, null, 2));
    console.log(`💾 Saved URLs to: ${configPath}`);
    
    console.log('\n🎉 All placeholder images uploaded successfully!');
    console.log('\n📋 URLs to use in your code:');
    console.log(`Product placeholder: ${uploadedUrls['product-placeholder.svg']}`);
    console.log(`Hero placeholder: ${uploadedUrls['hero-placeholder.svg']}`);
    console.log(`Small product placeholder: ${uploadedUrls['product-placeholder-small.svg']}`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();
