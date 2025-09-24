#!/usr/bin/env node

/**
 * Check Growth plan configuration
 */

import { stripe } from './utils/stripeClient.js';

async function checkGrowthPlan() {
  console.log('🔍 Checking Growth plan configuration...\n');
  
  try {
    // Check environment variables for Growth price ID
    const growthPriceId = process.env.VITE_STRIPE_PRICE_GROWTH;
    console.log('📋 Environment Growth Price ID:', growthPriceId || 'NOT SET');
    
    if (growthPriceId) {
      console.log('\n💰 Checking Growth price in Stripe...');
      try {
        const price = await stripe.prices.retrieve(growthPriceId);
        console.log(`   Amount: $${price.unit_amount / 100}`);
        console.log(`   Type: ${price.type}`);
        console.log(`   Active: ${price.active}`);
        console.log(`   Metadata:`, price.metadata);
        
        if (price.unit_amount === 4900) { // $49
          console.log('\n✅ Growth price looks correct ($49)');
        } else {
          console.log(`\n⚠️  Growth price amount is $${price.unit_amount / 100}, expected $49`);
        }
        
        if (!price.active) {
          console.log('\n❌ PROBLEM: Growth price is not active!');
        }
        
      } catch (error) {
        console.log(`❌ Error fetching Growth price: ${error.message}`);
      }
    }
    
    // List all active prices to see what's available
    console.log('\n📦 All active prices in Stripe:');
    try {
      const prices = await stripe.prices.list({ active: true, limit: 20 });
      
      prices.data.forEach((price, i) => {
        console.log(`   ${i + 1}. ${price.id} - $${price.unit_amount / 100} (${price.type})`);
        if (price.metadata && Object.keys(price.metadata).length > 0) {
          console.log(`      Metadata:`, price.metadata);
        }
      });
      
    } catch (error) {
      console.log(`❌ Error listing prices: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkGrowthPlan().catch(console.error);
