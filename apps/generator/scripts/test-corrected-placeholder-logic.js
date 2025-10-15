// test-corrected-placeholder-logic.js
import axios from "axios";

async function testCorrectedPlaceholderLogic() {
  console.log('🧪 Testing corrected placeholder logic...');
  
  try {
    // Test 1: Products with valid images should NOT get placeholder
    console.log('\n📦 Test 1: Products with valid images');
    const testWithValidImages = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test with valid product images',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product with Image',
          description: 'This product has a valid image',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg' // Valid image
        },
        {
          name: 'Product without Image',
          description: 'This product has no image',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: '' // Empty image - should get placeholder
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false,
        hero_image_url: 'https://example.com/existing-hero.jpg' // Existing hero - should NOT get placeholder
      },
      customHeroImage: false
    };

    console.log('📤 Sending test with mixed product images...');
    
    const response1 = await axios.post('http://localhost:3001/api/generate/preview', testWithValidImages, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response1.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml1 = response1.data.emails?.[0]?.content || response1.data.mjml || '';
      
      // Check product images
      const productImageLines = mjml1.split('\n').filter(line => 
        line.includes('mj-image') && line.includes('{{P') && line.includes('IMAGE_URL')
      );
      
      console.log(`📊 Found ${productImageLines.length} product image elements`);
      
      // Check if valid image is preserved
      if (mjml1.includes('example.com/valid-image1.jpg')) {
        console.log('✅ Valid product image preserved (no placeholder override)');
      } else {
        console.log('❌ Valid product image was overridden with placeholder');
      }
      
      // Check if empty image gets placeholder
      if (mjml1.includes('masxzswlivypqantomhc.supabase.co')) {
        console.log('✅ Placeholder used for empty product image');
      } else {
        console.log('⚠️ No placeholder found for empty product image');
      }
      
      // Check hero image
      if (mjml1.includes('example.com/existing-hero.jpg')) {
        console.log('✅ Existing hero image preserved (no placeholder override)');
      } else {
        console.log('❌ Existing hero image was overridden with placeholder');
      }
      
    } else {
      console.log('❌ Request failed with status:', response1.status);
    }

    // Test 2: No hero image should get placeholder
    console.log('\n🖼️ Test 2: No hero image scenario');
    const testNoHeroImage = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test with no hero image',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product with Image',
          description: 'This product has a valid image',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false
        // No hero_image_url - should get placeholder
      },
      customHeroImage: false
    };

    console.log('📤 Sending test with no hero image...');
    
    const response2 = await axios.post('http://localhost:3001/api/generate/preview', testNoHeroImage, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response2.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml2 = response2.data.emails?.[0]?.content || response2.data.mjml || '';
      
      // Check if hero gets placeholder
      const heroImageLines = mjml2.split('\n').filter(line => 
        line.includes('mj-image') && (line.includes('hero') || line.includes('Hero'))
      );
      
      console.log(`📊 Found ${heroImageLines.length} hero image elements`);
      
      if (mjml2.includes('masxzswlivypqantomhc.supabase.co')) {
        console.log('✅ Placeholder used for missing hero image');
      } else {
        console.log('❌ No placeholder found for missing hero image');
      }
      
    } else {
      console.log('❌ Request failed with status:', response2.status);
    }

    // Test 3: Custom hero should NOT get placeholder
    console.log('\n🎨 Test 3: Custom hero image scenario');
    const testCustomHero = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test with custom hero',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product with Image',
          description: 'This product has a valid image',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: true
      },
      customHeroImage: true // Should generate custom hero, not use placeholder
    };

    console.log('📤 Sending test with custom hero...');
    
    const response3 = await axios.post('http://localhost:3001/api/generate/preview', testCustomHero, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response3.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml3 = response3.data.emails?.[0]?.content || response3.data.mjml || '';
      
      // Check if custom hero is used (should contain CUSTOMHEROIMAGE.COM or actual generated image)
      if (mjml3.includes('CUSTOMHEROIMAGE.COM') || mjml3.includes('generated-hero')) {
        console.log('✅ Custom hero generation used (no placeholder override)');
      } else if (mjml3.includes('masxzswlivypqantomhc.supabase.co')) {
        console.log('❌ Placeholder used instead of custom hero generation');
      } else {
        console.log('⚠️ No clear hero image strategy detected');
      }
      
    } else {
      console.log('❌ Request failed with status:', response3.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing corrected logic:', error.message);
    }
  }
}

// Run the test
testCorrectedPlaceholderLogic();
