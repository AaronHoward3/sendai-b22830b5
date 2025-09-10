// Test script to verify freemium flow
const fetch = require('node-fetch');

async function testFreemiumFlow() {
  console.log('🧪 Testing Freemium Flow...\n');

  try {
    // Test 1: Anonymous preview endpoint
    console.log('1. Testing anonymous preview endpoint...');
    const previewResponse = await fetch('http://localhost:3001/api/generate/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'example.com',
        emailType: 'Newsletter',
        designAesthetic: 'minimal_clean',
        tone: 'friendly',
        userContext: 'Test context',
        imageContext: 'Test image context',
        products: [],
        brandData: {},
        customHeroImage: false,
      }),
    });

    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      console.log('✅ Preview endpoint works!');
      console.log('   - isPreviewMode:', previewData.isPreviewMode);
      console.log('   - previewMessage:', previewData.previewMessage);
      console.log('   - emails generated:', previewData.emails?.length || 0);
    } else {
      console.log('❌ Preview endpoint failed:', previewResponse.status);
      const errorText = await previewResponse.text();
      console.log('   Error:', errorText);
    }

    // Test 2: Authenticated endpoint (should fail without auth)
    console.log('\n2. Testing authenticated endpoint without auth...');
    const authResponse = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'example.com',
        emailType: 'Newsletter',
        designAesthetic: 'minimal_clean',
        tone: 'friendly',
        userContext: 'Test context',
        imageContext: 'Test image context',
        products: [],
        brandData: {},
        customHeroImage: false,
      }),
    });

    if (authResponse.status === 401) {
      console.log('✅ Authenticated endpoint correctly requires auth (401)');
    } else {
      console.log('❌ Authenticated endpoint should require auth, got:', authResponse.status);
    }

    console.log('\n🎉 Freemium flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFreemiumFlow();
