#!/usr/bin/env node

/**
 * Stripe Credit Issue Diagnostic Script
 * This script helps identify why credits aren't being filled when users upgrade their Stripe plan
 */

import { stripe } from './utils/stripeClient.js';
import { supabase } from './utils/supabaseClient.js';

console.log('🔍 Stripe Credit Issue Diagnostic\n');

// Check environment variables
console.log('📋 Environment Check:');
const envVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET', 
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`  ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
});

console.log('\n🔧 Webhook Event Analysis:');
console.log('When a user upgrades their Stripe subscription, these events should fire:');
console.log('1. customer.subscription.updated - Updates subscription and resets credits');
console.log('2. invoice.paid - Handles recurring payments and resets credits');
console.log('3. checkout.session.completed - Handles new subscriptions');

console.log('\n🎯 Potential Issues:');
console.log('1. Missing environment variables (webhook can\'t authenticate)');
console.log('2. Webhook endpoint not receiving events');
console.log('3. Price metadata not set correctly');
console.log('4. Supabase permissions issues');
console.log('5. User ID not found in Stripe customer metadata');

console.log('\n🧪 Testing Functions:');

async function testStripeConnection() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('❌ Cannot test Stripe connection - STRIPE_SECRET_KEY missing');
      return false;
    }
    
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Stripe connection successful - Mode: ${account.livemode ? 'LIVE' : 'TEST'}`);
    return true;
  } catch (error) {
    console.log(`❌ Stripe connection failed: ${error.message}`);
    return false;
  }
}

async function testSupabaseConnection() {
  try {
    if (!supabase) {
      console.log('❌ Cannot test Supabase connection - credentials missing');
      return false;
    }
    
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    return false;
  }
}

async function testPriceMetadata() {
  try {
    const priceIds = [
      process.env.VITE_STRIPE_PRICE_PAYG,
      process.env.VITE_STRIPE_PRICE_STARTER,
      process.env.VITE_STRIPE_PRICE_GROWTH,
      process.env.VITE_STRIPE_PRICE_SCALE
    ].filter(Boolean);

    if (priceIds.length === 0) {
      console.log('❌ No price IDs configured in environment');
      return false;
    }

    console.log('📦 Checking price metadata:');
    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        const metadata = price.metadata || {};
        console.log(`  ${priceId}:`);
        console.log(`    Amount: $${price.unit_amount / 100}`);
        console.log(`    Type: ${price.type}`);
        console.log(`    Metadata: emails=${metadata.emails}, images=${metadata.images}, revisions=${metadata.revisions}, brand_limit=${metadata.brand_limit}`);
        
        if (!metadata.emails || !metadata.images || !metadata.revisions) {
          console.log(`    ⚠️  WARNING: Missing required metadata!`);
        }
      } catch (error) {
        console.log(`    ❌ Error fetching price ${priceId}: ${error.message}`);
      }
    }
    return true;
  } catch (error) {
    console.log(`❌ Price metadata test failed: ${error.message}`);
    return false;
  }
}

async function testWebhookEndpoint() {
  try {
    const response = await fetch('http://localhost:3001/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`✅ Webhook endpoint reachable - Status: ${response.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Webhook endpoint not reachable: ${error.message}`);
    console.log('   Make sure your API server is running on localhost:3001');
    return false;
  }
}

async function main() {
  console.log('Running diagnostic tests...\n');
  
  const results = await Promise.all([
    testStripeConnection(),
    testSupabaseConnection(), 
    testPriceMetadata(),
    testWebhookEndpoint()
  ]);
  
  const allPassed = results.every(Boolean);
  
  console.log('\n📊 Diagnostic Summary:');
  if (allPassed) {
    console.log('✅ All tests passed! The issue might be:');
    console.log('   - Webhook events not being sent by Stripe');
    console.log('   - User ID not properly set in Stripe customer metadata');
    console.log('   - Database permissions issues');
  } else {
    console.log('❌ Some tests failed. Fix the issues above first.');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Set up missing environment variables');
  console.log('2. Create Stripe prices with proper metadata');
  console.log('3. Test webhook events with Stripe CLI');
  console.log('4. Check database logs for errors');
  console.log('5. Verify user IDs in Stripe customer metadata');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
