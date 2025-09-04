#!/usr/bin/env node

import { scrapeProductsFromDomain as universalScrapeProducts } from "../utils/universalProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Quick test domains
const QUICK_TEST_DOMAINS = [
  'nike.com',
  'gymshark.com',
  'etsy.com',
  'target.com',
  'bestbuy.com'
];

async function quickTest() {
  console.log('🚀 Quick testing universal scraper...\n');
  
  for (const domain of QUICK_TEST_DOMAINS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${domain}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const startTime = Date.now();
      const products = await universalScrapeProducts(domain, { maxProducts: 3 });
      const time = Date.now() - startTime;
      
      console.log(`✅ Found ${products.length} products in ${time}ms`);
      
      if (products.length > 0) {
        console.log('\n📦 Products found:');
        products.forEach((product, index) => {
          console.log(`\n${index + 1}. ${product.name}`);
          console.log(`   URL: ${product.url}`);
          console.log(`   Image: ${product.image_url}`);
          console.log(`   Source: ${product.source}`);
          if (product.price) {
            console.log(`   Price: ${product.price}`);
          }
          if (product.description) {
            console.log(`   Description: ${product.description.substring(0, 100)}...`);
          }
        });
      } else {
        console.log('❌ No products found');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✨ Quick test completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickTest().catch(console.error);
}

export { quickTest };
