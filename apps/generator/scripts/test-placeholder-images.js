// test-placeholder-images.js
import axios from "axios";

async function testPlaceholderImages() {
  console.log('🧪 Testing placeholder image implementation...');
  
  try {
    // Test with products that have no images
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test email with products that have no images',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product 1',
          description: 'A great product',
          price: '$29.99',
          url: 'https://example.com/product1',
          // No image_url provided
        },
        {
          name: 'Product 2', 
          description: 'Another great product',
          price: '$49.99',
          url: 'https://example.com/product2',
          image_url: '', // Empty image URL
        },
        {
          name: 'Product 3',
          description: 'Product with valid image',
          price: '$19.99', 
          url: 'https://example.com/product3',
          image_url: 'https://example.com/valid-image.jpg'
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com'
      },
      customHeroImage: false
    };

    console.log('📤 Sending test request with mixed product images...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      // Check if the MJML contains placeholder images
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      if (mjml.includes('via.placeholder.com/300x300?text=Product+Image')) {
        console.log('✅ Placeholder images found in generated MJML!');
        console.log('📊 Placeholder count:', (mjml.match(/via\.placeholder\.com\/300x300\?text=Product\+Image/g) || []).length);
      } else {
        console.log('⚠️ No placeholder images found in MJML');
      }
      
      // Show a snippet of the MJML
      const imageLines = mjml.split('\n').filter(line => line.includes('mj-image'));
      console.log('🖼️ Image elements found:', imageLines.length);
      imageLines.slice(0, 3).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line.trim()}`);
      });
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing placeholder images:', error.message);
    }
  }
}

// Run the test
testPlaceholderImages();
