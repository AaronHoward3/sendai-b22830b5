#!/usr/bin/env node

import { scrapeProductsFromDomain as hybridScrapeProducts } from "../utils/hybridProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

console.log('Starting hybrid scraper test...');
console.log('SCRAPINGBEE_API_KEY:', process.env.SCRAPINGBEE_API_KEY ? 'SET' : 'NOT SET');

async function quickTest() {
  try {
    console.log('\nTesting etsy.com (marketplace)...');
    const products = await hybridScrapeProducts('etsy.com', { maxProducts: 3, minConfidence: 0.6 });
    console.log('Products found:', products.length);
    
    if (products.length > 0) {
      console.log('\nProducts:');
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   URL: ${product.url}`);
        console.log(`   Image: ${product.image_url}`);
        console.log(`   Source: ${product.source}`);
        console.log(`   Confidence: ${(product.confidence * 100).toFixed(1)}%`);
        if (product.price) {
          console.log(`   Price: ${product.price}`);
        }
      });
    } else {
      console.log('No products found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

quickTest();
