import { scrapeWebsiteStylesEnhanced, findClosestGoogleFont } from './utils/websiteScraper.js';

// Test the enhanced font detection with various websites
const testDomains = [
  'apple.com',
  'nike.com', 
  'adidas.com',
  'spotify.com',
  'netflix.com',
  'airbnb.com'
];

async function testFontDetection() {
  console.log('🧪 Testing Enhanced Font Detection System\n');
  
  for (const domain of testDomains) {
    console.log(`\n🔍 Testing: ${domain}`);
    console.log('='.repeat(50));
    
    try {
      const result = await scrapeWebsiteStylesEnhanced(domain);
      
      if (result.success) {
        console.log(`✅ Success!`);
        console.log(`📝 Detected fonts: ${result.fonts.join(', ')}`);
        console.log(`🎯 Primary font: ${result.primaryFont}`);
        console.log(`🔧 Sources: CSS=${result.sources?.css}, Vision=${result.sources?.vision}`);
        
        // Test font matching
        console.log(`\n🔍 Font matching tests:`);
        result.fonts.slice(0, 3).forEach(font => {
          const match = findClosestGoogleFont(font);
          console.log(`  "${font}" → "${match}"`);
        });
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Font detection testing complete!');
}

// Run the test
testFontDetection().catch(console.error);
