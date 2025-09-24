#!/usr/bin/env node

/**
 * Debug the getAllowances function
 */

import { stripe } from './utils/stripeClient.js';

async function debugGetAllowances() {
  const priceId = 'price_1S8NKzEFkIBODi7ixmloCw1C';
  
  console.log(`🔍 Debugging getAllowances for price: ${priceId}\n`);
  
  try {
    // This is exactly what the getAllowances function does
    const price = await stripe.prices.retrieve(priceId);
    const m = price.metadata || {};
    
    console.log('📦 Raw price data:');
    console.log(`   Type: ${price.type}`);
    console.log(`   Amount: $${price.unit_amount / 100}`);
    console.log(`   Metadata object:`, m);
    
    console.log('\n🔧 Processing metadata:');
    const allowances = {
      kind: m.kind || (price.type === 'one_time' ? 'onetime' : 'recurring'),
      emails: parseInt(m.emails || '0', 10),
      images: parseInt(m.images || '0', 10),
      revisions: parseInt(m.revisions || '0', 10),
      brand_limit: parseInt(m.brand_limit || '0', 10)
    };
    
    console.log('📋 Final allowances object:');
    console.log(`   kind: ${allowances.kind}`);
    console.log(`   emails: ${allowances.emails} (${typeof allowances.emails})`);
    console.log(`   images: ${allowances.images} (${typeof allowances.images})`);
    console.log(`   revisions: ${allowances.revisions} (${typeof allowances.revisions})`);
    console.log(`   brand_limit: ${allowances.brand_limit} (${typeof allowances.brand_limit})`);
    
    if (allowances.emails === 0) {
      console.log('\n❌ PROBLEM: emails is 0!');
      console.log('   This means either:');
      console.log('   1. m.emails is undefined/empty');
      console.log('   2. parseInt is failing');
      console.log('   3. The metadata is not being read correctly');
      
      console.log('\n🔍 Debugging step by step:');
      console.log(`   m.emails = "${m.emails}"`);
      console.log(`   m.emails || '0' = "${m.emails || '0'}"`);
      console.log(`   parseInt("${m.emails || '0'}", 10) = ${parseInt(m.emails || '0', 10)}`);
    } else {
      console.log('\n✅ Allowances look correct!');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debugGetAllowances().catch(console.error);
