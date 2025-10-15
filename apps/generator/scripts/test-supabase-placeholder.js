// test-supabase-placeholder.js
import axios from "axios";

async function testSupabasePlaceholder() {
  console.log('🧪 Testing your Supabase placeholder image...');
  
  try {
    // Test with products that have no images
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test email with your Supabase placeholder image',
      imageContext: 'Test context',
      products: [
        {
          name: 'Product 1',
          description: 'A great product',
          price: '$29.99',
          url: 'https://example.com/product1',
          // No image_url provided - should use your placeholder
        },
        {
          name: 'Product 2', 
          description: 'Another great product',
          price: '$49.99',
          url: 'https://example.com/product2',
          image_url: '', // Empty image URL - should use your placeholder
        }
      ],
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com'
      },
      customHeroImage: false
    };

    console.log('📤 Sending test request...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      // Check if the MJML contains your Supabase placeholder image
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      if (mjml.includes('masxzswlivypqantomhc.supabase.co')) {
        console.log('✅ Your Supabase placeholder image found in generated MJML!');
        
        // Count how many times your placeholder is used
        const placeholderCount = (mjml.match(/masxzswlivypqantomhc\.supabase\.co/g) || []).length;
        console.log(`📊 Your placeholder image used ${placeholderCount} times`);
        
      } else {
        console.log('⚠️ Your Supabase placeholder image not found in MJML');
        
        // Check for old placeholder URLs
        if (mjml.includes('via.placeholder.com')) {
          console.log('⚠️ Found old via.placeholder.com URLs - update may not be complete');
        }
      }
      
      // Show a snippet of the MJML around image elements
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
      console.error('❌ Error testing Supabase placeholder:', error.message);
    }
  }
}

// Run the test
testSupabasePlaceholder();
