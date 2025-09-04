#!/usr/bin/env node

import { scrapeProductsFromDomain as legacyScrapeProducts } from "../utils/productScraper.js";
import { scrapeProductsFromDomain as enhancedScrapeProducts } from "../utils/enhancedProductScraper.js";
import { scrapeProductsFromDomain as universalScrapeProducts } from "../utils/universalProductScraper.js";
import { scrapeProductsFromDomain as hybridScrapeProducts } from "../utils/hybridProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Test domains that were problematic with previous scrapers
const TEST_DOMAINS = [
  'nike.com',           // Had "Order Status" issue
  'gymshark.com',       // Shopify store
  'etsy.com',           // Marketplace
  'target.com',         // Retail store
  'bestbuy.com',        // Electronics
  'gymshark.com',       // Test again
  'allbirds.com',       // Another Shopify
  'kotn.com'            // Another Shopify
];

async function testScraper(domain, scraperName, scraperFunction) {
  console.log(`\n🔍 Testing ${scraperName} on ${domain}...`);
  
  try {
    const startTime = Date.now();
    
    let results;
    if (scraperName === 'Hybrid') {
      results = await scraperFunction(domain, { maxProducts: 3, minConfidence: 0.6 });
    } else if (scraperName === 'Universal') {
      results = await scraperFunction(domain, { maxProducts: 3 });
    } else {
      results = await scraperFunction(domain);
    }
    
    const time = Date.now() - startTime;
    
    console.log(`✅ ${scraperName} on ${domain}:`);
    console.log(`   Products: ${results.length}`);
    console.log(`   Time: ${time}ms`);
    
    if (results.length > 0) {
      console.log(`   Sample: ${results[0].name}`);
      console.log(`   Source: ${results[0].source || 'unknown'}`);
      if (results[0].confidence) {
        console.log(`   Confidence: ${(results[0].confidence * 100).toFixed(1)}%`);
      }
      if (results[0].price) {
        console.log(`   Price: ${results[0].price}`);
      }
    }
    
    return {
      domain,
      scraper: scraperName,
      count: results.length,
      time: time,
      products: results,
      success: true,
      sources: results.map(p => p.source || 'unknown'),
      avgConfidence: results.length > 0 ? 
        results.reduce((sum, p) => sum + (p.confidence || 0), 0) / results.length : 0
    };
    
  } catch (error) {
    console.log(`❌ ${scraperName} on ${domain}: ${error.message}`);
    return {
      domain,
      scraper: scraperName,
      count: 0,
      time: 0,
      products: [],
      success: false,
      error: error.message,
      sources: [],
      avgConfidence: 0
    };
  }
}

async function runHybridTests() {
  console.log('🚀 Starting hybrid scraper comparison...\n');
  
  const results = [];
  
  // Test each domain with all four scrapers
  for (const domain of TEST_DOMAINS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing domain: ${domain}`);
    console.log(`${'='.repeat(60)}`);
    
    // Test all four scrapers
    const legacyResult = await testScraper(domain, 'Legacy', legacyScrapeProducts);
    const enhancedResult = await testScraper(domain, 'Enhanced', enhancedScrapeProducts);
    const universalResult = await testScraper(domain, 'Universal', universalScrapeProducts);
    const hybridResult = await testScraper(domain, 'Hybrid', hybridScrapeProducts);
    
    results.push(legacyResult, enhancedResult, universalResult, hybridResult);
    
    // Add delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate comprehensive report
  generateHybridReport(results);
}

function generateHybridReport(results) {
  console.log('\n📊 HYBRID SCRAPER COMPARISON REPORT');
  console.log('='.repeat(80));
  
  // Group results by scraper
  const legacyResults = results.filter(r => r.scraper === 'Legacy');
  const enhancedResults = results.filter(r => r.scraper === 'Enhanced');
  const universalResults = results.filter(r => r.scraper === 'Universal');
  const hybridResults = results.filter(r => r.scraper === 'Hybrid');
  
  // Overall statistics
  console.log('\n📈 OVERALL PERFORMANCE:');
  console.log('-'.repeat(40));
  
  const legacySuccess = legacyResults.filter(r => r.success && r.count > 0).length;
  const enhancedSuccess = enhancedResults.filter(r => r.success && r.count > 0).length;
  const universalSuccess = universalResults.filter(r => r.success && r.count > 0).length;
  const hybridSuccess = hybridResults.filter(r => r.success && r.count > 0).length;
  
  console.log(`Legacy scraper: ${legacySuccess}/${legacyResults.length} successful (${(legacySuccess/legacyResults.length*100).toFixed(1)}%)`);
  console.log(`Enhanced scraper: ${enhancedSuccess}/${enhancedResults.length} successful (${(enhancedSuccess/enhancedResults.length*100).toFixed(1)}%)`);
  console.log(`Universal scraper: ${universalSuccess}/${universalResults.length} successful (${(universalSuccess/universalResults.length*100).toFixed(1)}%)`);
  console.log(`Hybrid scraper: ${hybridSuccess}/${hybridResults.length} successful (${(hybridSuccess/hybridResults.length*100).toFixed(1)}%)`);
  
  // Average products per successful scrape
  const avgLegacy = legacyResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(legacySuccess, 1);
  const avgEnhanced = enhancedResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(enhancedSuccess, 1);
  const avgUniversal = universalResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(universalSuccess, 1);
  const avgHybrid = hybridResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(hybridSuccess, 1);
  
  console.log(`\nAverage products per successful scrape:`);
  console.log(`Legacy: ${avgLegacy.toFixed(1)} products`);
  console.log(`Enhanced: ${avgEnhanced.toFixed(1)} products`);
  console.log(`Universal: ${avgUniversal.toFixed(1)} products`);
  console.log(`Hybrid: ${avgHybrid.toFixed(1)} products`);
  
  // Average confidence for hybrid scraper
  const avgHybridConfidence = hybridResults.filter(r => r.success).reduce((sum, r) => sum + r.avgConfidence, 0) / Math.max(hybridSuccess, 1);
  console.log(`\nHybrid scraper average confidence: ${(avgHybridConfidence * 100).toFixed(1)}%`);
  
  // Quality comparison - check for false positives
  console.log('\n🔍 QUALITY ANALYSIS:');
  console.log('-'.repeat(40));
  
  const falsePositives = {
    legacy: countFalsePositives(legacyResults),
    enhanced: countFalsePositives(enhancedResults),
    universal: countFalsePositives(universalResults),
    hybrid: countFalsePositives(hybridResults)
  };
  
  console.log('False positives (navigation/UI elements):');
  console.log(`Legacy: ${falsePositives.legacy}`);
  console.log(`Enhanced: ${falsePositives.enhanced}`);
  console.log(`Universal: ${falsePositives.universal}`);
  console.log(`Hybrid: ${falsePositives.hybrid}`);
  
  // Strategy breakdown for hybrid scraper
  console.log('\n🔍 HYBRID SCRAPER STRATEGY BREAKDOWN:');
  console.log('-'.repeat(40));
  
  const strategies = {};
  hybridResults.forEach(r => {
    r.sources.forEach(source => {
      strategies[source] = (strategies[source] || 0) + 1;
    });
  });
  
  Object.entries(strategies).forEach(([strategy, count]) => {
    console.log(`${strategy}: ${count} products`);
  });
  
  // Domains where hybrid scraper outperformed others
  console.log('\n🚀 HYBRID SCRAPER IMPROVEMENTS:');
  console.log('-'.repeat(40));
  
  const domains = [...new Set(results.map(r => r.domain))];
  domains.forEach(domain => {
    const legacy = legacyResults.find(r => r.domain === domain);
    const enhanced = enhancedResults.find(r => r.domain === domain);
    const universal = universalResults.find(r => r.domain === domain);
    const hybrid = hybridResults.find(r => r.domain === domain);
    
    if (hybrid && hybrid.success && hybrid.count > 0) {
      const legacyCount = legacy?.count || 0;
      const enhancedCount = enhanced?.count || 0;
      const universalCount = universal?.count || 0;
      
      if (hybrid.count > Math.max(legacyCount, enhancedCount, universalCount)) {
        console.log(`${domain}: Hybrid (${hybrid.count}) > Legacy (${legacyCount}) & Enhanced (${enhancedCount}) & Universal (${universalCount})`);
      }
    }
  });
  
  // Detailed domain-by-domain comparison
  console.log('\n📋 DETAILED DOMAIN COMPARISON:');
  console.log('-'.repeat(100));
  console.log('Domain'.padEnd(20) + 'Legacy'.padEnd(10) + 'Enhanced'.padEnd(10) + 'Universal'.padEnd(10) + 'Hybrid'.padEnd(10) + 'Best');
  console.log('-'.repeat(100));
  
  domains.forEach(domain => {
    const legacy = legacyResults.find(r => r.domain === domain);
    const enhanced = enhancedResults.find(r => r.domain === domain);
    const universal = universalResults.find(r => r.domain === domain);
    const hybrid = hybridResults.find(r => r.domain === domain);
    
    const legacyCount = legacy?.success ? legacy.count : 0;
    const enhancedCount = enhanced?.success ? enhanced.count : 0;
    const universalCount = universal?.success ? universal.count : 0;
    const hybridCount = hybrid?.success ? hybrid.count : 0;
    
    const maxCount = Math.max(legacyCount, enhancedCount, universalCount, hybridCount);
    let best = '';
    if (maxCount === hybridCount) best = 'Hybrid';
    else if (maxCount === universalCount) best = 'Universal';
    else if (maxCount === enhancedCount) best = 'Enhanced';
    else if (maxCount === legacyCount) best = 'Legacy';
    
    console.log(
      domain.padEnd(20) + 
      legacyCount.toString().padEnd(10) + 
      enhancedCount.toString().padEnd(10) + 
      universalCount.toString().padEnd(10) + 
      hybridCount.toString().padEnd(10) + 
      best
    );
  });
  
  // Show sample products from hybrid scraper
  console.log('\n📦 SAMPLE HYBRID SCRAPER RESULTS:');
  console.log('-'.repeat(40));
  
  hybridResults.forEach(result => {
    if (result.success && result.products.length > 0) {
      console.log(`\n${result.domain}:`);
      result.products.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`);
        console.log(`     Source: ${product.source}`);
        console.log(`     Confidence: ${(product.confidence * 100).toFixed(1)}%`);
        if (product.price) {
          console.log(`     Price: ${product.price}`);
        }
      });
    }
  });
}

function countFalsePositives(results) {
  const falsePositiveKeywords = [
    'order status', 'track order', 'order details',
    'menu', 'search', 'cart', 'account', 'login',
    'privacy', 'terms', 'policy', 'help', 'support',
    'about us', 'contact us', 'blog', 'news'
  ];
  
  let count = 0;
  results.forEach(result => {
    result.products.forEach(product => {
      const text = product.name.toLowerCase();
      if (falsePositiveKeywords.some(keyword => text.includes(keyword))) {
        count++;
      }
    });
  });
  
  return count;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHybridTests().catch(console.error);
}

export { testScraper, runHybridTests };
