// test-hero-placeholder.js
import axios from "axios";

async function testHeroPlaceholder() {
  console.log('🧪 Testing hero image placeholder injection...');
  
  try {
    // Test with no custom hero and no saved image
    const testPayload = {
      domain: 'test.com',
      emailType: 'Promotion',
      userContext: 'Test email with hero placeholder image',
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
        // No customHeroImage set (defaults to false)
        // No savedHeroImageUrl provided
      },
      customHeroImage: false // Explicitly set to false to test hero placeholder
    };

    console.log('📤 Sending test request with no hero image...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      // Check if the MJML contains your Supabase placeholder image in hero sections
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      if (mjml.includes('masxzswlivypqantomhc.supabase.co')) {
        console.log('✅ Your Supabase placeholder image found in generated MJML!');
        
        // Count how many times your placeholder is used
        const placeholderCount = (mjml.match(/masxzswlivypqantomhc\.supabase\.co/g) || []).length;
        console.log(`📊 Your placeholder image used ${placeholderCount} times`);
        
        // Check specifically for hero image usage
        const heroImageLines = mjml.split('\n').filter(line => 
          line.includes('mj-image') && line.includes('masxzswlivypqantomhc.supabase.co')
        );
        console.log(`🖼️ Hero image elements with your placeholder: ${heroImageLines.length}`);
        
      } else {
        console.log('⚠️ Your Supabase placeholder image not found in MJML');
        
        // Check for old placeholder URLs
        if (mjml.includes('via.placeholder.com')) {
          console.log('⚠️ Found old via.placeholder.com URLs - update may not be complete');
        }
        
        // Check for CUSTOMHEROIMAGE placeholders that weren't replaced
        if (mjml.includes('CUSTOMHEROIMAGE.COM')) {
          console.log('⚠️ Found unreplaced CUSTOMHEROIMAGE.COM placeholders');
        }
      }
      
      // Show a snippet of the MJML around hero sections
      const lines = mjml.split('\n');
      const heroStart = lines.findIndex(line => line.includes('Hero Section') || line.includes('hero') || line.includes('mj-image'));
      if (heroStart !== -1) {
        console.log('📄 Hero section preview:');
        lines.slice(heroStart, heroStart + 10).forEach((line, i) => {
          console.log(`   ${heroStart + i + 1}: ${line}`);
        });
      }
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing hero placeholder:', error.message);
    }
  }
}

// Run the test
testHeroPlaceholder();