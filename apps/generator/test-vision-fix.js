import { analyzeWebsiteWithVision } from './utils/websiteScraper.js';

// Test the vision analysis fix
async function testVisionAnalysis() {
  console.log('🧪 Testing Vision Analysis Fix\n');
  
  const testDomain = 'gfuel.com';
  
  console.log(`🔍 Testing vision analysis for: ${testDomain}`);
  console.log('='.repeat(50));
  
  try {
    const result = await analyzeWebsiteWithVision(testDomain);
    
    if (result.success) {
      console.log(`✅ Vision analysis successful!`);
      console.log(`📝 Detected fonts: ${result.fonts.join(', ')}`);
      console.log(`🔍 Analysis: ${result.analysis}`);
    } else {
      console.log(`❌ Vision analysis failed: ${result.error}`);
      console.log(`🔍 Analysis: ${result.analysis || 'No analysis available'}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n✅ Vision analysis test complete!');
}

// Run the test
testVisionAnalysis().catch(console.error);
