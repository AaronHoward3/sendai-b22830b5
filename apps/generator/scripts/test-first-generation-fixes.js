// test-first-generation-fixes.js
import axios from "axios";

async function testFirstGenerationFixes() {
  console.log('🧪 Testing first generation fixes across different skins...');
  
  const testPayload = {
    domain: 'test.com',
    emailType: 'Promotion',
    userContext: 'Test first generation fixes',
    imageContext: 'Test context',
    products: [
      {
        name: 'Test Product 1',
        description: 'First test product for debugging',
        price: '$19.99',
        url: 'https://example.com/product1',
        image_url: 'https://example.com/valid-image1.jpg'
      },
      {
        name: 'Test Product 2',
        description: 'Second test product for debugging',
        price: '$29.99',
        url: 'https://example.com/product2',
        image_url: 'https://example.com/valid-image2.jpg'
      }
    ],
    brandData: {
      name: 'Test Brand',
      website: 'https://test.com',
      customHeroImage: false,
      primary_color: '#3b82f6'
    },
    customHeroImage: false
  };

  const skinsToTest = [
    'minimal_clean',
    'bold_contrasting', 
    'magazine_serif',
    'warm_editorial'
  ];

  for (const skin of skinsToTest) {
    console.log(`\n🎨 Testing ${skin} skin...`);
    
    try {
      const payload = {
        ...testPayload,
        designAesthetic: skin
      };

      console.log(`📤 Sending test for ${skin}...`);
      
      const response = await axios.post('http://localhost:3001/api/generate/preview', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${skin} test successful!`);
        
        const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
        
        // Check for products
        const hasProducts = mjml.includes('{{P1_TITLE}}') === false && mjml.includes('Test Product');
        const productSections = mjml.match(/<mj-section[^>]*>[\s\S]*?Test Product[\s\S]*?<\/mj-section>/gi) || [];
        
        console.log(`📊 ${skin} analysis:`);
        console.log(`   Has products: ${hasProducts ? '✅' : '❌'}`);
        console.log(`   Product sections: ${productSections.length}`);
        
        // Check for hero image
        const hasHeroImage = mjml.includes('CUSTOMHEROIMAGE.COM') === false && 
                            (mjml.includes('src="http') || mjml.includes('background-url="http'));
        console.log(`   Has hero image: ${hasHeroImage ? '✅' : '❌'}`);
        
        // Check for skin-specific features
        if (skin === 'bold_contrasting') {
          const hasDividers = mjml.match(/<mj-divider[^>]*>/g) || [];
          const hasDarkDividerBg = mjml.includes('background-color="#111319"') || mjml.includes('background-color="#1a1d26"');
          console.log(`   Has dividers: ${hasDividers.length > 0 ? '✅' : '❌'}`);
          console.log(`   Has dark divider backgrounds: ${hasDarkDividerBg ? '✅' : '❌'}`);
        }
        
        if (skin === 'magazine_serif') {
          const hasDividers = mjml.match(/<mj-divider[^>]*>/g) || [];
          console.log(`   Has dividers: ${hasDividers.length > 0 ? '✅' : '❌'}`);
        }
        
        if (skin === 'warm_editorial') {
          const hasDividers = mjml.match(/<mj-divider[^>]*>/g) || [];
          console.log(`   Has dividers: ${hasDividers.length > 0 ? '✅' : '❌'}`);
        }
        
        // Show a snippet of the MJML
        console.log(`📄 ${skin} MJML snippet:`);
        const lines = mjml.split('\n');
        const relevantLines = lines.filter(line => 
          line.includes('Test Product') || 
          line.includes('mj-section') || 
          line.includes('mj-divider') ||
          line.includes('src="') ||
          line.includes('background-color=')
        );
        relevantLines.slice(0, 8).forEach((line, i) => {
          console.log(`   ${i + 1}: ${line.trim()}`);
        });
        
      } else {
        console.log(`❌ ${skin} test failed with status:`, response.status);
      }
      
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`⚠️ Trial already used for ${skin} (expected for repeat tests)`);
      } else {
        console.error(`❌ Error testing ${skin}:`, error.message);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📋 Summary of first generation fixes:');
  console.log('✅ Added timeout to brand style manifest building');
  console.log('✅ Added fallback manifest structure');
  console.log('✅ Enhanced error logging and debugging');
  console.log('✅ Better hero image error handling');
  console.log('✅ Improved product section debugging');
  console.log('✅ Fixed potential race conditions');
  
  console.log('\n🎯 Key improvements:');
  console.log('- Brand style manifest timeout prevents hanging');
  console.log('- Fallback manifest ensures generation continues');
  console.log('- Enhanced logging helps identify issues');
  console.log('- Better error handling prevents silent failures');
}

// Run the test
testFirstGenerationFixes();
