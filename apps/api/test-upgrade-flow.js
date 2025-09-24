#!/usr/bin/env node

/**
 * Test the upgrade flow by simulating what should happen
 */

import { stripe } from './utils/stripeClient.js';

async function testUpgradeFlow() {
  const customerId = 'cus_T6Rr2S6Z2m1cNX';
  const growthPriceId = 'price_1S8NN3EFkIBODi7ixdrgv6zl';
  
  console.log('🧪 Testing upgrade flow...');
  console.log(`   Customer: ${customerId}`);
  console.log(`   Growth Price: ${growthPriceId}\n`);
  
  try {
    // Check if Growth price exists and is active
    console.log('1️⃣ Checking Growth price...');
    const price = await stripe.prices.retrieve(growthPriceId);
    console.log(`   ✅ Price exists: $${price.unit_amount / 100}`);
    console.log(`   ✅ Active: ${price.active}`);
    console.log(`   ✅ Metadata:`, price.metadata);
    
    // Check current subscription
    console.log('\n2️⃣ Checking current subscription...');
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active'
    });
    
    if (subscriptions.data.length === 0) {
      console.log('   ❌ No active subscription found');
      return;
    }
    
    const currentSub = subscriptions.data[0];
    console.log(`   ✅ Current subscription: ${currentSub.id}`);
    console.log(`   ✅ Current price: ${currentSub.items.data[0].price.id}`);
    console.log(`   ✅ Status: ${currentSub.status}`);
    
    // Test creating a checkout session for upgrade
    console.log('\n3️⃣ Testing checkout session creation...');
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: growthPriceId, quantity: 1 }],
        success_url: 'https://www.irios.ai/settings?billing=success',
        cancel_url: 'https://www.irios.ai/settings?billing=cancel',
        allow_promotion_codes: true
      });
      
      console.log(`   ✅ Checkout session created: ${session.id}`);
      console.log(`   ✅ URL: ${session.url}`);
      
      // Clean up - don't actually complete this session
      console.log('\n4️⃣ Cleaning up test session...');
      await stripe.checkout.sessions.expire(session.id);
      console.log('   ✅ Test session expired');
      
    } catch (error) {
      console.log(`   ❌ Error creating checkout session: ${error.message}`);
    }
    
    console.log('\n🎯 Analysis:');
    console.log('If the test above worked, then the issue is in your frontend code.');
    console.log('If it failed, then there\'s an issue with Stripe configuration.');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testUpgradeFlow().catch(console.error);
