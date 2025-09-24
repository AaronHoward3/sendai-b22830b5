#!/usr/bin/env node

/**
 * Check Stripe Price Metadata
 */

import { stripe } from './utils/stripeClient.js';

async function checkPriceMetadata() {
  const priceId = 'price_1S8NKzEFkIBODi7ixmloCw1C';
  
  console.log(`🔍 Checking metadata for price: ${priceId}`);
  
  try {
    const price = await stripe.prices.retrieve(priceId);
    console.log('📦 Price Details:');
    console.log(`   Amount: $${price.unit_amount / 100}`);
    console.log(`   Type: ${price.type}`);
    console.log(`   Currency: ${price.currency}`);
    console.log(`   Active: ${price.active}`);
    
    console.log('\n📋 Metadata:');
    const metadata = price.metadata || {};
    console.log(`   emails: ${metadata.emails || 'MISSING'}`);
    console.log(`   images: ${metadata.images || 'MISSING'}`);
    console.log(`   revisions: ${metadata.revisions || 'MISSING'}`);
    console.log(`   brand_limit: ${metadata.brand_limit || 'MISSING'}`);
    console.log(`   kind: ${metadata.kind || 'MISSING'}`);
    
    if (!metadata.emails || !metadata.images || !metadata.revisions) {
      console.log('\n❌ PROBLEM FOUND: Missing required metadata!');
      console.log('   This is why credits are being set to 0');
      console.log('\n🔧 SOLUTION:');
      console.log('   1. Go to Stripe Dashboard → Products → Find this price');
      console.log('   2. Edit the price and add metadata:');
      console.log('      emails: 30 (or whatever your plan should have)');
      console.log('      images: 5');
      console.log('      revisions: 60');
      console.log('      brand_limit: 2');
      console.log('      kind: recurring');
    } else {
      console.log('\n✅ Metadata looks correct');
    }
    
  } catch (error) {
    console.log(`❌ Error fetching price: ${error.message}`);
  }
}

checkPriceMetadata().catch(console.error);
