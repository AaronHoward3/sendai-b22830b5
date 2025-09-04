#!/usr/bin/env node

import { scrapeProductsFromDomain as legacyScrapeProducts } from "../utils/productScraper.js";
import { scrapeProductsFromDomain as enhancedScrapeProducts } from "../utils/enhancedProductScraper.js";
import { scrapeProductsFromDomain as universalScrapeProducts } from "../utils/universalProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Comprehensive test domains across different platforms
const TEST_DOMAINS = [
  // Shopify stores
  'gymshark.com',
  'allbirds.com',
  'kotn.com',
  'glossier.com',
  'awaytravel.com',
  
  // WooCommerce stores  
  'woocommerce.com',
  'elementor.com',
  'woocommerce.com/store',
  
  // Magento stores
  'nike.com',
  'samsung.com',
  'adidas.com',
  
  // BigCommerce stores
  'skullcandy.com',
  'ben-sherman.com',
  'bigcommerce.com',
  
  // Squarespace Commerce
  'parachutehome.com',
  'warbyparker.com',
  'squarespace.com',
  
  // Etsy
  'etsy.com',
  'etsy.com/shop',
  
  // Amazon
  'amazon.com',
  'amazon.com/s',
  
  // Target
  'target.com',
  'target.com/c',
  
  // Walmart
  'walmart.com',
  'walmart.com/browse',
  
  // Other platforms
  'bestbuy.com',
  'homedepot.com',
  'lowes.com',
  'wayfair.com',
  'overstock.com',
  'newegg.com',
  'bhphotovideo.com',
  'adorama.com',
  'b&h.com',
  'adorama.com'
];

async function testScraper(domain, scraperName, scraperFunction) {
  console.log(`\n🔍 Testing ${scraperName} on ${domain}...`);
  
  try {
    const startTime = Date.now();
    
    let results;
    if (scraperName === 'Universal') {
      results = await scraperFunction(domain, { maxProducts: 6 });
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
      sources: results.map(p => p.source || 'unknown')
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
      sources: []
    };
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive product scraper comparison...\n');
  
  const results = [];
  
  // Test each domain with all three scrapers
  for (const domain of TEST_DOMAINS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing domain: ${domain}`);
    console.log(`${'='.repeat(60)}`);
    
    // Test all three scrapers
    const legacyResult = await testScraper(domain, 'Legacy', legacyScrapeProducts);
    const enhancedResult = await testScraper(domain, 'Enhanced', enhancedScrapeProducts);
    const universalResult = await testScraper(domain, 'Universal', universalScrapeProducts);
    
    results.push(legacyResult, enhancedResult, universalResult);
    
    // Add delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate comprehensive report
  generateReport(results);
}

function generateReport(results) {
  console.log('\n📊 COMPREHENSIVE SCRAPER COMPARISON REPORT');
  console.log('='.repeat(80));
  
  // Group results by scraper
  const legacyResults = results.filter(r => r.scraper === 'Legacy');
  const enhancedResults = results.filter(r => r.scraper === 'Enhanced');
  const universalResults = results.filter(r => r.scraper === 'Universal');
  
  // Overall statistics
  console.log('\n📈 OVERALL PERFORMANCE:');
  console.log('-'.repeat(40));
  
  const legacySuccess = legacyResults.filter(r => r.success && r.count > 0).length;
  const enhancedSuccess = enhancedResults.filter(r => r.success && r.count > 0).length;
  const universalSuccess = universalResults.filter(r => r.success && r.count > 0).length;
  
  console.log(`Legacy scraper: ${legacySuccess}/${legacyResults.length} successful (${(legacySuccess/legacyResults.length*100).toFixed(1)}%)`);
  console.log(`Enhanced scraper: ${enhancedSuccess}/${enhancedResults.length} successful (${(enhancedSuccess/enhancedResults.length*100).toFixed(1)}%)`);
  console.log(`Universal scraper: ${universalSuccess}/${universalResults.length} successful (${(universalSuccess/universalResults.length*100).toFixed(1)}%)`);
  
  // Average products per successful scrape
  const avgLegacy = legacyResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(legacySuccess, 1);
  const avgEnhanced = enhancedResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(enhancedSuccess, 1);
  const avgUniversal = universalResults.filter(r => r.success).reduce((sum, r) => sum + r.count, 0) / Math.max(universalSuccess, 1);
  
  console.log(`\nAverage products per successful scrape:`);
  console.log(`Legacy: ${avgLegacy.toFixed(1)} products`);
  console.log(`Enhanced: ${avgEnhanced.toFixed(1)} products`);
  console.log(`Universal: ${avgUniversal.toFixed(1)} products`);
  
  // Average response time
  const avgTimeLegacy = legacyResults.reduce((sum, r) => sum + r.time, 0) / legacyResults.length;
  const avgTimeEnhanced = enhancedResults.reduce((sum, r) => sum + r.time, 0) / enhancedResults.length;
  const avgTimeUniversal = universalResults.reduce((sum, r) => sum + r.time, 0) / universalResults.length;
  
  console.log(`\nAverage response time:`);
  console.log(`Legacy: ${avgTimeLegacy.toFixed(0)}ms`);
  console.log(`Enhanced: ${avgTimeEnhanced.toFixed(0)}ms`);
  console.log(`Universal: ${avgTimeUniversal.toFixed(0)}ms`);
  
  // Source breakdown for universal scraper
  console.log('\n🔍 UNIVERSAL SCRAPER SOURCE BREAKDOWN:');
  console.log('-'.repeat(40));
  
  const sources = {};
  universalResults.forEach(r => {
    r.sources.forEach(source => {
      sources[source] = (sources[source] || 0) + 1;
    });
  });
  
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`${source}: ${count} products`);
  });
  
  // Best performing domains for each scraper
  console.log('\n🏆 TOP PERFORMING DOMAINS:');
  console.log('-'.repeat(40));
  
  const bestLegacy = legacyResults
    .filter(r => r.success)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  const bestEnhanced = enhancedResults
    .filter(r => r.success)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  const bestUniversal = universalResults
    .filter(r => r.success)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  console.log('Legacy scraper:');
  bestLegacy.forEach(r => {
    console.log(`  ${r.domain}: ${r.count} products`);
  });
  
  console.log('\nEnhanced scraper:');
  bestEnhanced.forEach(r => {
    console.log(`  ${r.domain}: ${r.count} products`);
  });
  
  console.log('\nUniversal scraper:');
  bestUniversal.forEach(r => {
    console.log(`  ${r.domain}: ${r.count} products`);
  });
  
  // Domains where universal scraper outperformed others
  console.log('\n🚀 UNIVERSAL SCRAPER IMPROVEMENTS:');
  console.log('-'.repeat(40));
  
  const domains = [...new Set(results.map(r => r.domain))];
  domains.forEach(domain => {
    const legacy = legacyResults.find(r => r.domain === domain);
    const enhanced = enhancedResults.find(r => r.domain === domain);
    const universal = universalResults.find(r => r.domain === domain);
    
    if (universal && universal.success && universal.count > 0) {
      const legacyCount = legacy?.count || 0;
      const enhancedCount = enhanced?.count || 0;
      
      if (universal.count > Math.max(legacyCount, enhancedCount)) {
        console.log(`${domain}: Universal (${universal.count}) > Legacy (${legacyCount}) & Enhanced (${enhancedCount})`);
      }
    }
  });
  
  // Detailed domain-by-domain comparison
  console.log('\n📋 DETAILED DOMAIN COMPARISON:');
  console.log('-'.repeat(80));
  console.log('Domain'.padEnd(25) + 'Legacy'.padEnd(10) + 'Enhanced'.padEnd(10) + 'Universal'.padEnd(10) + 'Best');
  console.log('-'.repeat(80));
  
  domains.forEach(domain => {
    const legacy = legacyResults.find(r => r.domain === domain);
    const enhanced = enhancedResults.find(r => r.domain === domain);
    const universal = universalResults.find(r => r.domain === domain);
    
    const legacyCount = legacy?.success ? legacy.count : 0;
    const enhancedCount = enhanced?.success ? enhanced.count : 0;
    const universalCount = universal?.success ? universal.count : 0;
    
    const maxCount = Math.max(legacyCount, enhancedCount, universalCount);
    let best = '';
    if (maxCount === universalCount) best = 'Universal';
    else if (maxCount === enhancedCount) best = 'Enhanced';
    else if (maxCount === legacyCount) best = 'Legacy';
    
    console.log(
      domain.padEnd(25) + 
      legacyCount.toString().padEnd(10) + 
      enhancedCount.toString().padEnd(10) + 
      universalCount.toString().padEnd(10) + 
      best
    );
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests().catch(console.error);
}

export { testScraper, runComprehensiveTests };
