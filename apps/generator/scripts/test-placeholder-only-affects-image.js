// test-placeholder-only-affects-image.js
import axios from "axios";

async function testPlaceholderOnlyAffectsImage() {
  console.log('🧪 Testing that placeholder only affects image URL...');
  
  try {
    // Test with products that have some data but no images
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test placeholder only affects image',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product with Real Image',
          description: 'This product has a real image',
          price: '$19.99',
          url: 'https://example.com/product1',
          image_url: 'https://example.com/real-image.jpg' // Real image
        },
        {
          name: 'Product without Image',
          description: 'This product has no image but has other data',
          price: '$29.99',
          url: 'https://example.com/product2',
          image_url: '' // No image - should get placeholder
        },
        {
          name: 'Another Product',
          description: 'Another product description',
          price: '$39.99',
          url: 'https://example.com/product3',
          image_url: 'https://example.com/another-real-image.jpg' // Real image
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false
      },
      customHeroImage: false
    };

    console.log('📤 Sending test with mixed product data...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      // Check that product names are preserved
      if (mjml.includes('Product with Real Image') && 
          mjml.includes('Product without Image') && 
          mjml.includes('Another Product')) {
        console.log('✅ All product names preserved correctly');
      } else {
        console.log('❌ Some product names were lost');
      }
      
      // Check that descriptions are preserved
      if (mjml.includes('This product has a real image') && 
          mjml.includes('This product has no image but has other data') && 
          mjml.includes('Another product description')) {
        console.log('✅ All product descriptions preserved correctly');
      } else {
        console.log('❌ Some product descriptions were lost');
      }
      
      // Check that prices are preserved
      if (mjml.includes('$19.99') && 
          mjml.includes('$29.99') && 
          mjml.includes('$39.99')) {
        console.log('✅ All product prices preserved correctly');
      } else {
        console.log('❌ Some product prices were lost');
      }
      
      // Check that URLs are preserved
      if (mjml.includes('https://example.com/product1') && 
          mjml.includes('https://example.com/product2') && 
          mjml.includes('https://example.com/product3')) {
        console.log('✅ All product URLs preserved correctly');
      } else {
        console.log('❌ Some product URLs were lost');
      }
      
      // Check that real images are preserved
      if (mjml.includes('https://example.com/real-image.jpg') && 
          mjml.includes('https://example.com/another-real-image.jpg')) {
        console.log('✅ Real product images preserved correctly');
      } else {
        console.log('❌ Real product images were overridden');
      }
      
      // Check that placeholder is only used for empty image
      const placeholderCount = (mjml.match(/masxzswlivypqantomhc\.supabase\.co/g) || []).length;
      console.log(`🔧 Placeholder images used: ${placeholderCount} (should be 1 for the empty image)`);
      
      if (placeholderCount === 1) {
        console.log('✅ Placeholder only used for product without image');
      } else {
        console.log('❌ Placeholder used incorrectly');
      }
      
      // Show a snippet of the MJML to verify
      console.log('\n📄 Sample MJML snippet:');
      const lines = mjml.split('\n');
      const productLines = lines.filter(line => 
        line.includes('{{P') || line.includes('Product with') || line.includes('$19.99')
      );
      productLines.slice(0, 10).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line.trim()}`);
      });
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing placeholder logic:', error.message);
    }
  }
}

// Run the test
testPlaceholderOnlyAffectsImage();
