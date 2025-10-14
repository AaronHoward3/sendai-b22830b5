// Test script for vision-based promotion style detection
import { detectPromotionStyleWithVision, enhanceStyleDetectionWithVision } from '../src/services/visionStyleDetector.js';

async function testStyleDetection() {
  console.log('🧪 Testing vision-based promotion style detection...\n');
  
  // Test URLs for different brand types
  const testUrls = [
    'https://apple.com',           // Should recommend minimal_clean
    'https://nike.com',            // Should recommend bold_contrasting  
    'https://patagonia.com',       // Should recommend editorial_story
    'https://microsoft.com',       // Should recommend default or minimal_clean
  ];
  
  for (const url of testUrls) {
    console.log(`\n🔍 Analyzing: ${url}`);
    try {
      const result = await detectPromotionStyleWithVision(url);
      console.log(`✅ Result:`, {
        style: result.style,
        confidence: result.confidence,
        reasoning: result.reasoning
      });
    } catch (error) {
      console.log(`❌ Error:`, error.message);
    }
  }
  
  console.log('\n🧪 Testing enhanced detection with brand hints...\n');
  
  // Test with brand hints
  const brandHints = {
    brandType: 'tech startup',
    industry: 'technology',
    colors: { primary: '#007bff', secondary: '#6c757d' }
  };
  
  try {
    const enhancedResult = await enhanceStyleDetectionWithVision('https://stripe.com', brandHints);
    console.log(`✅ Enhanced Result:`, {
      style: enhancedResult.style,
      confidence: enhancedResult.confidence,
      reasoning: enhancedResult.reasoning,
      method: enhancedResult.method
    });
  } catch (error) {
    console.log(`❌ Enhanced Error:`, error.message);
  }
}

// Run the test
testStyleDetection().catch(console.error);
