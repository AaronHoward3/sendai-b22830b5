#!/usr/bin/env node

import { scrapeProductsFromDomain } from "../utils/enhancedProductScraper.js";

async function testNike() {
  console.log('🧪 Testing enhanced scraper with Nike...\n');
  
  try {
    const products = await scrapeProductsFromDomain('nike.com');
    
    console.log(`✅ Found ${products.length} products from Nike:`);
    console.log('='.repeat(60));
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Source: ${product.source || 'unknown'}`);
      console.log(`   Valid URL: ${product.url.includes('/t/') ? '✅' : '❓'}`);
      console.log(`   Privacy-related: ${product.name.toLowerCase().includes('privacy') || product.url.includes('privacy') || product.url.includes('do-not-share') ? '❌' : '✅'}`);
      if (product.price) console.log(`   Price: ${product.price}`);
      console.log('');
    });
    
    // Check for problematic results
    const badResults = products.filter(p => 
      p.name.toLowerCase().includes('privacy') ||
      p.name.toLowerCase().includes('settings') ||
      p.url.includes('do-not-share') ||
      p.url.includes('privacy') ||
      p.url.includes('settings')
    );
    
    if (badResults.length > 0) {
      console.log('❌ Found problematic results:');
      badResults.forEach(p => {
        console.log(`   - "${p.name}" (${p.url})`);
      });
    } else {
      console.log('✅ No privacy/settings links found in results!');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Check if SCRAPINGBEE_API_KEY is set
if (!process.env.SCRAPINGBEE_API_KEY) {
  console.log('❌ Error: SCRAPINGBEE_API_KEY environment variable is required');
  process.exit(1);
}

testNike().catch(console.error);
