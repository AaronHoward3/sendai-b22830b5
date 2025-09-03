#!/usr/bin/env node

import { scrapeProductsFromDomain } from "../utils/enhancedProductScraper.js";

async function demo() {
  console.log('🚀 Enhanced Product Scraper Demo\n');
  
  // Test with a few different types of stores
  const testSites = [
    { domain: 'gymshark.com', platform: 'Shopify' },
    { domain: 'allbirds.com', platform: 'Shopify' },
    { domain: 'kotn.com', platform: 'Shopify' }
  ];
  
  for (const site of testSites) {
    console.log(`🔍 Testing ${site.domain} (${site.platform})...`);
    
    try {
      const products = await scrapeProductsFromDomain(site.domain);
      
      console.log(`✅ Found ${products.length} products:`);
      
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}`);
        console.log(`      URL: ${product.url}`);
        console.log(`      Image: ${product.image_url.substring(0, 60)}...`);
        console.log(`      Source: ${product.source || 'unknown'}`);
        if (product.price) console.log(`      Price: ${product.price}`);
        console.log('');
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('-'.repeat(60));
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Check if SCRAPINGBEE_API_KEY is set
if (!process.env.SCRAPINGBEE_API_KEY) {
  console.log('❌ Error: SCRAPINGBEE_API_KEY environment variable is required');
  console.log('   Set it in your .env file or export it:');
  console.log('   export SCRAPINGBEE_API_KEY="your-api-key"');
  process.exit(1);
}

demo().catch(console.error);
