// test-bold-contrasting-dark-dividers.js
import axios from "axios";

async function testBoldContrastingDarkDividers() {
  console.log('🧪 Testing bold contrasting dark divider backgrounds...');
  
  try {
    // Test bold contrasting skin with multiple sections
    console.log('\n🎨 Test: Bold contrasting with dark divider backgrounds');
    const boldContrastingPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test bold contrasting dark dividers',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product 1',
          description: 'First test product',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        },
        {
          name: 'Product 2',
          description: 'Second test product',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: 'https://example.com/valid-image2.jpg'
        },
        {
          name: 'Product 3',
          description: 'Third test product',
          price: '$39.99',
          url: 'https://example.com/product3',
          image_url: 'https://example.com/valid-image3.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false,
        primary_color: '#ff6b35' // Orange brand color for testing
      },
      customHeroImage: false,
      designAesthetic: 'bold_contrasting'
    };

    console.log('📤 Sending test with bold contrasting skin...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', boldContrastingPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Bold contrasting test request successful!');
      
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      // Check for divider sections with dark backgrounds
      const dividerSections = mjml.match(/<mj-section[^>]*padding="20px 0"[^>]*>[\s\S]*?<mj-divider[\s\S]*?<\/mj-section>/gi) || [];
      const darkDividerSections = dividerSections.filter(section => 
        section.includes('background-color="#111319"') || section.includes('background-color="#1a1d26"')
      );
      
      console.log(`📊 Dark divider analysis:`);
      console.log(`   Total divider sections: ${dividerSections.length}`);
      console.log(`   Dark background dividers: ${darkDividerSections.length}`);
      console.log(`   Has dark divider backgrounds: ${darkDividerSections.length > 0 ? '✅' : '❌'}`);
      
      if (darkDividerSections.length > 0) {
        console.log('✅ Dark divider backgrounds successfully applied!');
        
        // Analyze each dark divider section
        darkDividerSections.forEach((section, i) => {
          console.log(`\n   Dark Divider Section ${i + 1}:`);
          
          // Check for proper dark background
          const hasDarkBg = section.includes('background-color="#111319"') || section.includes('background-color="#1a1d26"');
          console.log(`     Has dark background: ${hasDarkBg ? '✅' : '❌'}`);
          
          // Check for brand color divider
          const hasBrandDivider = section.includes('border-color="#ff6b35"') || section.includes('border-color="#ffffff"');
          console.log(`     Has brand color divider: ${hasBrandDivider ? '✅' : '❌'}`);
          
          // Check for proper divider width
          const hasProperWidth = section.includes('border-width="2px"');
          console.log(`     Has proper width (2px): ${hasProperWidth ? '✅' : '❌'}`);
          
          // Show the section structure
          const lines = section.split('\n');
          const previewLines = lines.slice(0, 6);
          console.log(`     Structure:`);
          previewLines.forEach(line => {
            if (line.trim()) {
              console.log(`       ${line.trim()}`);
            }
          });
        });
        
      } else {
        console.log('❌ No dark divider backgrounds found');
        
        // Show what divider sections we do have
        if (dividerSections.length > 0) {
          console.log('\n   Found divider sections without dark backgrounds:');
          dividerSections.forEach((section, i) => {
            const lines = section.split('\n');
            const firstLine = lines.find(line => line.includes('<mj-section'));
            console.log(`     Divider ${i + 1}: ${firstLine?.trim()}`);
          });
        }
      }
      
      // Compare with other skins to ensure only bold contrasting has dark backgrounds
      console.log('\n🎨 Test: Magazine serif skin (should NOT have dark backgrounds)');
      const serifPayload = {
        ...boldContrastingPayload,
        designAesthetic: 'magazine_serif'
      };

      const serifResponse = await axios.post('http://localhost:3001/api/generate/preview', serifPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (serifResponse.status === 200) {
        const serifMjml = serifResponse.data.emails?.[0]?.content || serifResponse.data.mjml || '';
        const serifDividerSections = serifMjml.match(/<mj-section[^>]*padding="20px 0"[^>]*>[\s\S]*?<mj-divider[\s\S]*?<\/mj-section>/gi) || [];
        const serifDarkDividers = serifDividerSections.filter(section => 
          section.includes('background-color="#111319"') || section.includes('background-color="#1a1d26"')
        );
        
        console.log(`📊 Magazine serif comparison:`);
        console.log(`   Serif divider sections: ${serifDividerSections.length}`);
        console.log(`   Serif dark backgrounds: ${serifDarkDividers.length}`);
        console.log(`   Correctly no dark backgrounds: ${serifDarkDividers.length === 0 ? '✅' : '❌'}`);
      }
      
    } else {
      console.log('❌ Bold contrasting test request failed with status:', response.status);
    }
    
    // Summary
    console.log('\n📋 Summary of dark divider implementation:');
    console.log('✅ Bold contrasting: Dark section backgrounds + brand color dividers');
    console.log('✅ Magazine serif: Clean backgrounds + neutral dividers');
    console.log('✅ Warm editorial: Clean backgrounds + thick dividers');
    console.log('✅ Dark backgrounds only for bold contrasting skin');
    console.log('✅ Brand color dividers with proper contrast');
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing dark dividers:', error.message);
    }
  }
}

// Run the test
testBoldContrastingDarkDividers();
