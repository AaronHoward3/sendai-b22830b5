#!/usr/bin/env node

import { scrapeProductsFromDomain as hybridScrapeProducts } from "../utils/hybridProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

console.log('Starting Nike test with hybrid scraper...');
console.log('SCRAPINGBEE_API_KEY:', process.env.SCRAPINGBEE_API_KEY ? 'SET' : 'NOT SET');

async function testNike() {
  try {
    console.log('\nTesting nike.com with lower confidence...');
    const products = await hybridScrapeProducts('nike.com', { maxProducts: 5, minConfidence: 0.3 });
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
      console.log('❌ No products found for Nike');
    }
    
    console.log('\nTesting allbirds.com for comparison...');
    const allbirdsProducts = await hybridScrapeProducts('allbirds.com', { maxProducts: 3, minConfidence: 0.4 });
    console.log('Allbirds products found:', allbirdsProducts.length);
    
    if (allbirdsProducts.length > 0) {
      console.log('\nAllbirds Products:');
      allbirdsProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   URL: ${product.url}`);
        console.log(`   Image: ${product.image_url}`);
        console.log(`   Source: ${product.source}`);
        console.log(`   Confidence: ${(product.confidence * 100).toFixed(1)}%`);
        if (product.price) {
          console.log(`   Price: ${product.price}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNike();
