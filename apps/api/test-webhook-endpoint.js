#!/usr/bin/env node

/**
 * Test webhook endpoint to identify the issue
 */

async function testWebhookEndpoint() {
  const webhookUrl = 'https://iriosa-i-api.onrender.com/webhooks/stripe';
  
  console.log('🧪 Testing webhook endpoint...');
  console.log(`   URL: ${webhookUrl}\n`);
  
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connectivity...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Response: ${responseText}`);
    
    if (response.status === 400 && responseText.includes('signature')) {
      console.log('   ✅ Endpoint is reachable and validating signatures');
    } else if (response.status === 200) {
      console.log('   ⚠️  Endpoint responded with 200 (unexpected for invalid signature)');
    } else {
      console.log(`   ❌ Unexpected response: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error testing webhook: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('   This suggests the domain is not resolving');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   This suggests the server is not running');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   This suggests the server is not responding');
    }
  }
  
  console.log('\n🔍 Common webhook failure causes:');
  console.log('1. Webhook secret mismatch between Stripe and your .env');
  console.log('2. API server not running or crashed');
  console.log('3. Database connection issues');
  console.log('4. Environment variables not set correctly');
  console.log('5. CORS or security issues');
  
  console.log('\n🛠️  Next steps:');
  console.log('1. Check your Render.com logs for errors');
  console.log('2. Verify webhook secret matches between Stripe and your .env');
  console.log('3. Check if your API server is running');
  console.log('4. Test the webhook endpoint manually');
}

testWebhookEndpoint().catch(console.error);
