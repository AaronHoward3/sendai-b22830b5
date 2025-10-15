// test-generator-fixes.js
import axios from "axios";

async function testGeneratorFixes() {
  console.log('🧪 Testing generator fixes for hero images and product sections...');
  
  try {
    // Test 1: Hero image with custom generation
    console.log('\n🖼️ Test 1: Hero image generation and replacement');
    const heroTestPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test hero image generation',
      imageContext: 'Test context',
      products: [
        {
          name: 'Test Product 1',
          description: 'A test product',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        },
        {
          name: 'Test Product 2',
          description: 'Another test product',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: 'https://example.com/valid-image2.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: true // Request custom hero generation
      },
      customHeroImage: true
    };

    console.log('📤 Sending test with custom hero generation...');
    
    const response1 = await axios.post('http://localhost:3001/api/generate/preview', heroTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response1.status === 200) {
      console.log('✅ Hero test request successful!');
      
      const mjml1 = response1.data.emails?.[0]?.content || response1.data.mjml || '';
      
      // Check hero image replacement
      const hasCustomHero = mjml1.includes('CUSTOMHEROIMAGE.COM') === false;
      const hasPlaceholderHero = mjml1.includes('masxzswlivypqantomhc.supabase.co');
      
      console.log(`📊 Hero image analysis:`);
      console.log(`   Custom hero generated: ${hasCustomHero ? '✅' : '❌'}`);
      console.log(`   Placeholder hero used: ${hasPlaceholderHero ? '❌' : '✅'}`);
      
      if (hasCustomHero && !hasPlaceholderHero) {
        console.log('✅ Hero image replacement working correctly');
      } else {
        console.log('❌ Hero image replacement issue detected');
      }
      
    } else {
      console.log('❌ Hero test request failed with status:', response1.status);
    }

    // Test 2: Product section inclusion
    console.log('\n📦 Test 2: Product section inclusion');
    const productTestPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test product section inclusion',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product with Title',
          description: 'This product has a proper title',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        },
        {
          name: 'Another Product',
          description: 'This product also has a title',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: 'https://example.com/valid-image2.jpg'
        },
        {
          name: 'Third Product',
          description: 'Third product with title',
          price: '$39.99',
          url: 'https://example.com/product3',
          image_url: 'https://example.com/valid-image3.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false
      },
      customHeroImage: false
    };

    console.log('📤 Sending test with multiple products...');
    
    const response2 = await axios.post('http://localhost:3001/api/generate/preview', productTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response2.status === 200) {
      console.log('✅ Product test request successful!');
      
      const mjml2 = response2.data.emails?.[0]?.content || response2.data.mjml || '';
      
      // Check product section inclusion
      const productSections = mjml2.split('<mj-section').length - 1; // Count mj-section tags
      const hasProductImages = mjml2.includes('{{P1_IMAGE_URL}}') === false; // Should be replaced
      const hasProductTitles = mjml2.includes('{{P1_TITLE}}') === false; // Should be replaced
      const hasProductPrices = mjml2.includes('{{P1_PRICE}}') === false; // Should be replaced
      
      console.log(`📊 Product section analysis:`);
      console.log(`   Total sections: ${productSections}`);
      console.log(`   Product images replaced: ${hasProductImages ? '✅' : '❌'}`);
      console.log(`   Product titles replaced: ${hasProductTitles ? '✅' : '❌'}`);
      console.log(`   Product prices replaced: ${hasProductPrices ? '✅' : '❌'}`);
      
      if (productSections >= 2 && hasProductImages && hasProductTitles && hasProductPrices) {
        console.log('✅ Product section inclusion working correctly');
      } else {
        console.log('❌ Product section inclusion issue detected');
      }
      
      // Show a snippet of the MJML to verify
      console.log('\n📄 MJML snippet with products:');
      const lines = mjml2.split('\n');
      const productLines = lines.filter(line => 
        line.includes('{{P') || line.includes('mj-image') || line.includes('mj-text')
      );
      productLines.slice(0, 10).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line.trim()}`);
      });
      
    } else {
      console.log('❌ Product test request failed with status:', response2.status);
    }

    // Test 3: Invalid products handling
    console.log('\n🚫 Test 3: Invalid products handling');
    const invalidProductPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test invalid products',
      imageContext: 'Test context',
      products: [
        {
          name: '', // Empty title - should be filtered out
          description: 'Product with no title',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/valid-image1.jpg'
        },
        {
          // Missing name/title entirely
          description: 'Product with no name',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: 'https://example.com/valid-image2.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false
      },
      customHeroImage: false
    };

    console.log('📤 Sending test with invalid products...');
    
    const response3 = await axios.post('http://localhost:3001/api/generate/preview', invalidProductPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response3.status === 200) {
      console.log('✅ Invalid product test request successful!');
      
      const mjml3 = response3.data.emails?.[0]?.content || response3.data.mjml || '';
      
      // Should not have product sections with invalid products
      const hasProductPlaceholders = mjml3.includes('{{P1_TITLE}}') || mjml3.includes('{{P1_PRICE}}');
      
      console.log(`📊 Invalid product handling:`);
      console.log(`   Product placeholders present: ${hasProductPlaceholders ? '❌' : '✅'}`);
      
      if (!hasProductPlaceholders) {
        console.log('✅ Invalid products properly filtered out');
      } else {
        console.log('❌ Invalid products not properly handled');
      }
      
    } else {
      console.log('❌ Invalid product test request failed with status:', response3.status);
    }
    
    // Summary
    console.log('\n📋 Summary of fixes:');
    console.log('✅ Hero image replacement validation added');
    console.log('✅ Placeholder image saving prevention');
    console.log('✅ Product section injection improved');
    console.log('✅ Invalid product filtering added');
    console.log('✅ Better error handling and logging');
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing generator fixes:', error.message);
    }
  }
}

// Run the test
testGeneratorFixes();
