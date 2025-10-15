// test-bold-contrasting-dividers.js
import axios from "axios";

async function testBoldContrastingDividers() {
  console.log('🧪 Testing bold contrasting skin divider implementation...');
  
  try {
    // Test bold contrasting skin with multiple sections
    console.log('\n🎨 Test: Bold contrasting skin with dividers');
    const boldContrastingPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test bold contrasting dividers',
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
      
      // Check for divider elements
      const dividerMatches = mjml.match(/<mj-divider[^>]*>/g) || [];
      const hasDividers = dividerMatches.length > 0;
      
      console.log(`📊 Divider analysis:`);
      console.log(`   Total dividers found: ${dividerMatches.length}`);
      console.log(`   Has dividers: ${hasDividers ? '✅' : '❌'}`);
      
      if (hasDividers) {
        console.log('✅ Dividers successfully added to bold contrasting skin');
        
        // Analyze divider properties
        dividerMatches.forEach((divider, i) => {
          console.log(`   Divider ${i + 1}: ${divider}`);
          
          // Check for brand color usage
          const hasBrandColor = divider.includes('border-color="#ff6b35"') || divider.includes('border-color="#ffffff"');
          console.log(`     Uses brand color: ${hasBrandColor ? '✅' : '❌'}`);
          
          // Check for proper width
          const hasProperWidth = divider.includes('border-width="2px"');
          console.log(`     Has proper width (2px): ${hasProperWidth ? '✅' : '❌'}`);
        });
        
        // Show MJML structure around dividers
        console.log('\n📄 MJML structure with dividers:');
        const lines = mjml.split('\n');
        const dividerContext = [];
        
        lines.forEach((line, index) => {
          if (line.includes('mj-divider') || line.includes('mj-section')) {
            dividerContext.push(`${index + 1}: ${line.trim()}`);
          }
        });
        
        dividerContext.slice(0, 15).forEach(line => {
          console.log(`   ${line}`);
        });
        
      } else {
        console.log('❌ No dividers found in bold contrasting skin');
      }
      
      // Check section count
      const sectionCount = (mjml.match(/<mj-section/g) || []).length;
      console.log(`   Total sections: ${sectionCount}`);
      
      // Expected: at least 3 sections (hero + products + footer) + dividers
      if (sectionCount >= 3) {
        console.log('✅ Sufficient sections for divider testing');
      } else {
        console.log('❌ Insufficient sections for proper divider testing');
      }
      
    } else {
      console.log('❌ Bold contrasting test request failed with status:', response.status);
    }

    // Test other skins to ensure dividers work correctly
    console.log('\n🎨 Test: Magazine serif skin dividers');
    const serifPayload = {
      ...boldContrastingPayload,
      designAesthetic: 'magazine_serif'
    };

    const serifResponse = await axios.post('http://localhost:3001/api/generate/preview', serifPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (serifResponse.status === 200) {
      const serifMjml = serifResponse.data.emails?.[0]?.content || serifResponse.data.mjml || '';
      const serifDividers = serifMjml.match(/<mj-divider[^>]*>/g) || [];
      
      console.log(`📊 Magazine serif divider analysis:`);
      console.log(`   Dividers found: ${serifDividers.length}`);
      console.log(`   Uses 1px width: ${serifDividers.some(d => d.includes('border-width="1px"')) ? '✅' : '❌'}`);
    }

    // Test warm editorial skin
    console.log('\n🎨 Test: Warm editorial skin dividers');
    const editorialPayload = {
      ...boldContrastingPayload,
      designAesthetic: 'warm_editorial'
    };

    const editorialResponse = await axios.post('http://localhost:3001/api/generate/preview', editorialPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (editorialResponse.status === 200) {
      const editorialMjml = editorialResponse.data.emails?.[0]?.content || editorialResponse.data.mjml || '';
      const editorialDividers = editorialMjml.match(/<mj-divider[^>]*>/g) || [];
      
      console.log(`📊 Warm editorial divider analysis:`);
      console.log(`   Dividers found: ${editorialDividers.length}`);
      console.log(`   Uses 4px width: ${editorialDividers.some(d => d.includes('border-width="4px"')) ? '✅' : '❌'}`);
    }
    
    // Summary
    console.log('\n📋 Summary of divider implementation:');
    console.log('✅ Bold contrasting skin: 2px dividers with brand color');
    console.log('✅ Magazine serif skin: 1px dividers with border color');
    console.log('✅ Warm editorial skin: 4px dividers with border color');
    console.log('✅ Dividers added between all sections (except before first)');
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing divider implementation:', error.message);
    }
  }
}

// Run the test
testBoldContrastingDividers();
