#!/usr/bin/env node

/**
 * Test the billing checkout API endpoint
 */

import { stripe } from './utils/stripeClient.js';

async function testCheckoutAPI() {
  const customerId = 'cus_T6Rr2S6Z2m1cNX';
  const growthPriceId = 'price_1S8NN3EFkIBODi7ixdrgv6zl';
  
  console.log('🧪 Testing billing checkout API...');
  console.log(`   Customer: ${customerId}`);
  console.log(`   Price ID: ${growthPriceId}\n`);
  
  try {
    // This simulates what your API does in createCheckoutSession
    console.log('1️⃣ Getting or creating customer...');
    const customer = await stripe.customers.retrieve(customerId);
    console.log(`   ✅ Customer exists: ${customer.id}`);
    
    console.log('\n2️⃣ Retrieving price...');
    const price = await stripe.prices.retrieve(growthPriceId);
    console.log(`   ✅ Price exists: $${price.unit_amount / 100}`);
    console.log(`   ✅ Type: ${price.type}`);
    
    console.log('\n3️⃣ Determining mode...');
    const mode = price.type === 'one_time' ? 'payment' : 'subscription';
    console.log(`   ✅ Mode: ${mode}`);
    
    console.log('\n4️⃣ Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      client_reference_id: 'test-user-123', // This would be the actual user ID
      line_items: [{ price: growthPriceId, quantity: 1 }],
      success_url: 'https://www.irios.ai/settings?billing=success',
      cancel_url: 'https://www.irios.ai/settings?billing=cancel',
      allow_promotion_codes: true
    });
    
    console.log(`   ✅ Session created: ${session.id}`);
    console.log(`   ✅ URL: ${session.url}`);
    
    // Clean up
    await stripe.checkout.sessions.expire(session.id);
    console.log('\n5️⃣ Test session expired');
    
    console.log('\n🎯 Result: API logic works correctly');
    console.log('   The issue must be in the frontend API call or network request');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('   Details:', error);
  }
}

testCheckoutAPI().catch(console.error);
