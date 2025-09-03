import { scrapeProductsFromDomain } from "../utils/enhancedProductScraper.js";
import { scrapeProductsFromDomain as legacyScrapeProducts } from "../utils/productScraper.js";

// Test domains across different platforms
const TEST_DOMAINS = [
  // Shopify stores
  'gymshark.com',
  'allbirds.com',
  'kotn.com',
  
  // WooCommerce stores  
  'woocommerce.com',
  'elementor.com',
  
  // Magento stores
  'nike.com',
  'samsung.com',
  
  // BigCommerce stores
  'skullcandy.com',
  'ben-sherman.com',
  
  // Squarespace Commerce
  'parachutehome.com',
  'warbyparker.com',
  
  // Other platforms
  'etsy.com',
  'amazon.com',
  'target.com',
  'walmart.com'
];

async function testScraper(domain) {
  console.log(`\n🔍 Testing ${domain}...`);
  
  try {
    const startTime = Date.now();
    
    // Test enhanced scraper
    const enhancedResults = await scrapeProductsFromDomain(domain);
    const enhancedTime = Date.now() - startTime;
    
    // Test legacy scraper
    const legacyStartTime = Date.now();
    const legacyResults = await legacyScrapeProducts(domain);
    const legacyTime = Date.now() - legacyStartTime;
    
    console.log(`✅ ${domain}:`);
    console.log(`   Enhanced: ${enhancedResults.length} products (${enhancedTime}ms)`);
    console.log(`   Legacy: ${legacyResults.length} products (${legacyTime}ms)`);
    
    if (enhancedResults.length > 0) {
      console.log(`   Sample enhanced product: ${enhancedResults[0].name}`);
      console.log(`   Source: ${enhancedResults[0].source || 'unknown'}`);
    }
    
    return {
      domain,
      enhanced: {
        count: enhancedResults.length,
        time: enhancedTime,
        products: enhancedResults,
        success: true
      },
      legacy: {
        count: legacyResults.length,
        time: legacyTime,
        products: legacyResults,
        success: true
      }
    };
    
  } catch (error) {
    console.log(`❌ ${domain}: ${error.message}`);
    return {
      domain,
      enhanced: { count: 0, time: 0, products: [], success: false, error: error.message },
      legacy: { count: 0, time: 0, products: [], success: false, error: error.message }
    };
  }
}

async function runTests() {
  console.log('🚀 Starting product scraper tests...\n');
  
  const results = [];
  
  for (const domain of TEST_DOMAINS) {
    const result = await testScraper(domain);
    results.push(result);
    
    // Add delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  const enhancedSuccess = results.filter(r => r.enhanced.success && r.enhanced.count > 0).length;
  const legacySuccess = results.filter(r => r.legacy.success && r.legacy.count > 0).length;
  
  console.log(`Enhanced scraper: ${enhancedSuccess}/${results.length} successful`);
  console.log(`Legacy scraper: ${legacySuccess}/${results.length} successful`);
  
  const avgEnhanced = results.reduce((sum, r) => sum + r.enhanced.count, 0) / results.length;
  const avgLegacy = results.reduce((sum, r) => sum + r.legacy.count, 0) / results.length;
  
  console.log(`Average products - Enhanced: ${avgEnhanced.toFixed(1)}, Legacy: ${avgLegacy.toFixed(1)}`);
  
  // Best performers
  const bestEnhanced = results
    .filter(r => r.enhanced.success)
    .sort((a, b) => b.enhanced.count - a.enhanced.count)
    .slice(0, 3);
    
  console.log('\n🏆 Top enhanced scraper results:');
  bestEnhanced.forEach(r => {
    console.log(`   ${r.domain}: ${r.enhanced.count} products`);
  });
  
  // Source breakdown for enhanced scraper
  const sources = {};
  results.forEach(r => {
    r.enhanced.products.forEach(p => {
      const source = p.source || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
  });
  
  console.log('\n📈 Enhanced scraper sources:');
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} products`);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testScraper, runTests };
