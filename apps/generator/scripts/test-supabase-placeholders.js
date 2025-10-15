// test-supabase-placeholders.js
import axios from "axios";

async function testSupabasePlaceholders() {
  console.log('🧪 Testing Supabase placeholder image system...');
  
  try {
    // Test with products that have no images
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test email with Supabase placeholder images',
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
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com'
      },
      customHeroImage: false // No custom hero to test hero placeholder
    };

    console.log('📤 Sending test request with Supabase placeholders...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      // Check if the MJML contains Supabase placeholder images
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      if (mjml.includes('placeholder-images.supabase.co')) {
        console.log('✅ Supabase placeholder images found in generated MJML!');
        
        // Count different types of placeholders
        const productPlaceholders = (mjml.match(/placeholder-images\.supabase\.co.*product-placeholder\.svg/g) || []).length;
        const heroPlaceholders = (mjml.match(/placeholder-images\.supabase\.co.*hero-placeholder\.svg/g) || []).length;
        
        console.log(`📊 Product placeholders: ${productPlaceholders}`);
        console.log(`📊 Hero placeholders: ${heroPlaceholders}`);
        
      } else {
        console.log('⚠️ No Supabase placeholder images found in MJML');
        
        // Check for old placeholder URLs
        if (mjml.includes('via.placeholder.com')) {
          console.log('⚠️ Found old via.placeholder.com URLs - update may not be complete');
        }
      }
      
      // Show a snippet of the MJML around image elements
      const imageLines = mjml.split('\n').filter(line => line.includes('mj-image'));
      console.log('🖼️ Image elements found:', imageLines.length);
      imageLines.slice(0, 5).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line.trim()}`);
      });
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing Supabase placeholders:', error.message);
    }
  }
}

// Run the test
testSupabasePlaceholders();
