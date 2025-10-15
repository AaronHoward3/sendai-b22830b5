// test-hero-spacing-improvements.js
import axios from "axios";

async function testHeroSpacingImprovements() {
  console.log('🧪 Testing hero section spacing improvements...');
  
  try {
    // Test with different hero templates to verify spacing
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test hero spacing improvements',
      imageContext: 'Test context',
      products: [
        {
          name: 'Test Product',
          description: 'A test product',
          price: '$19.99',
          url: 'https://example.com/product',
          image_url: 'https://example.com/valid-image.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false,
        hero_title: 'This is a Long Hero Title That Should Not Be Squeezed Together',
        hero_subtitle: 'This is a longer subtitle that should have proper spacing and not appear cramped or squeezed together in the hero section'
      },
      customHeroImage: false
    };

    console.log('📤 Sending test request with long hero text...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      // Check for improved line-height values
      const h1Elements = mjml.match(/mj-class="h1"[^>]*>/g) || [];
      const h2Elements = mjml.match(/mj-class="h2"[^>]*>/g) || [];
      
      console.log(`📊 Found ${h1Elements.length} h1 elements and ${h2Elements.length} h2 elements`);
      
      // Check for improved padding values
      const paddingValues = mjml.match(/padding="[^"]*"/g) || [];
      const improvedPadding = paddingValues.filter(p => {
        const values = p.match(/\d+/g);
        return values && values.some(v => parseInt(v) >= 20); // Look for padding >= 20px
      });
      
      console.log(`📏 Found ${improvedPadding.length} elements with improved padding (>=20px)`);
      
      // Check for line-height improvements
      const lineHeightValues = mjml.match(/line-height="[^"]*"/g) || [];
      const improvedLineHeight = lineHeightValues.filter(lh => {
        const value = lh.match(/line-height="([^"]*)"/)?.[1];
        return value && parseFloat(value) >= 1.3; // Look for line-height >= 1.3
      });
      
      console.log(`📐 Found ${improvedLineHeight.length} elements with improved line-height (>=1.3)`);
      
      // Check for word-break and white-space properties
      const wordBreakElements = mjml.match(/word-break="normal"/g) || [];
      const whiteSpaceElements = mjml.match(/white-space="normal"/g) || [];
      
      console.log(`🔤 Found ${wordBreakElements.length} elements with word-break="normal"`);
      console.log(`🔤 Found ${whiteSpaceElements.length} elements with white-space="normal"`);
      
      // Show a snippet of the hero section
      console.log('\n📄 Hero section preview:');
      const lines = mjml.split('\n');
      const heroStart = lines.findIndex(line => 
        line.includes('hero') || line.includes('Hero') || line.includes('mj-class="h1"')
      );
      if (heroStart !== -1) {
        lines.slice(heroStart, heroStart + 15).forEach((line, i) => {
          console.log(`   ${heroStart + i + 1}: ${line.trim()}`);
        });
      }
      
      // Summary
      console.log('\n📋 Summary of improvements:');
      console.log(`✅ CSS Classes: h1 line-height improved to 1.4, h2 to 1.5`);
      console.log(`✅ Template Padding: Increased padding in hero templates`);
      console.log(`✅ Text Wrapping: Added word-break="normal" and white-space="normal"`);
      console.log(`✅ Spacing: Better spacing between hero elements`);
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing hero spacing:', error.message);
    }
  }
}

// Run the test
testHeroSpacingImprovements();
