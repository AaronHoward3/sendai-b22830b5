// test-scraper-image-preservation.js
import axios from "axios";

async function testScraperImagePreservation() {
  console.log('🧪 Testing scraper image preservation...');
  
  try {
    // Test with a real domain that has products with images
    const testPayload = {
      domain: 'shopify.com', // Use a domain that likely has product images
      emailType: 'Promotion',
      userContext: 'Test scraper image preservation',
      imageContext: 'Test context',
      products: [], // Let the scraper find products
      brandData: {
        name: 'Test Brand',
        website: 'https://test.com',
        customHeroImage: false
      },
      customHeroImage: false
    };

    console.log('📤 Sending test request to scrape products...');
    
    const response = await axios.post('http://localhost:3001/api/generate/preview', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      console.log('✅ Request successful!');
      
      const mjml = response.data.emails?.[0]?.content || response.data.mjml || '';
      
      // Check if we have product images
      const productImageLines = mjml.split('\n').filter(line => 
        line.includes('mj-image') && line.includes('{{P') && line.includes('IMAGE_URL')
      );
      
      console.log(`📊 Found ${productImageLines.length} product image elements`);
      
      // Count different types of images
      const placeholderCount = (mjml.match(/masxzswlivypqantomhc\.supabase\.co/g) || []).length;
      const realImageCount = mjml.split('\n').filter(line => 
        line.includes('mj-image') && 
        !line.includes('masxzswlivypqantomhc.supabase.co') &&
        !line.includes('placeholder') &&
        line.includes('http')
      ).length;
      
      console.log(`🖼️ Real product images found: ${realImageCount}`);
      console.log(`🔧 Placeholder images used: ${placeholderCount}`);
      
      if (realImageCount > 0) {
        console.log('✅ Scraper preserved real product images!');
      } else {
        console.log('⚠️ No real product images found - may need to test with different domain');
      }
      
      if (placeholderCount > 0) {
        console.log('✅ Placeholder used for products without images');
      }
      
      // Show some example image lines
      console.log('\n📄 Sample product image lines:');
      productImageLines.slice(0, 3).forEach((line, i) => {
        console.log(`   ${i + 1}: ${line.trim()}`);
      });
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Trial already used from this IP (expected for repeat tests)');
    } else {
      console.error('❌ Error testing scraper preservation:', error.message);
    }
  }
}

// Run the test
testScraperImagePreservation();
