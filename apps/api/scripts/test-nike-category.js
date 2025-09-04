#!/usr/bin/env node

import { scrapeProductsFromDomain } from "../utils/enhancedProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory (root of project)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function testNikeCategory() {
  console.log('🧪 Testing enhanced scraper with Nike category page...\n');
  
  try {
    const products = await scrapeProductsFromDomain('nike.com/w/new-3n82y');
    
    console.log(`✅ Found ${products.length} products from Nike category:`);
    console.log('='.repeat(60));
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Source: ${product.source || 'unknown'}`);
      console.log(`   Valid URL: ${product.url.includes('/t/') ? '✅' : '❓'}`);
      console.log(`   Image: ${product.image_url ? '✅' : '❌'}`);
      if (product.price) console.log(`   Price: ${product.price}`);
      console.log('');
    });
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Check if SCRAPINGBEE_API_KEY is set
if (!process.env.SCRAPINGBEE_API_KEY) {
  console.log('❌ Error: SCRAPINGBEE_API_KEY environment variable is required');
  process.exit(1);
}

testNikeCategory().catch(console.error);

