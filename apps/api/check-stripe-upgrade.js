#!/usr/bin/env node

/**
 * Check if the Growth upgrade actually happened in Stripe
 */

import { stripe } from './utils/stripeClient.js';

async function checkStripeUpgrade() {
  const subscriptionId = 'sub_1SAEyLEFkIBODi7iQMe937Dl';
  
  console.log('🔍 Checking if Growth upgrade happened in Stripe...');
  console.log(`   Subscription ID: ${subscriptionId}\n`);
  
  try {
    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('📦 Current Stripe subscription:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Customer: ${subscription.customer}`);
    console.log(`   Items count: ${subscription.items.data.length}`);
    
    if (subscription.items.data.length > 0) {
      const item = subscription.items.data[0];
      console.log(`   Current price ID: ${item.price.id}`);
      
      // Check what this price is
      const price = await stripe.prices.retrieve(item.price.id);
      console.log(`   Price amount: $${price.unit_amount / 100}`);
      console.log(`   Price metadata:`, price.metadata);
      
      // Check if this is Starter or Growth
      if (price.unit_amount === 1900) { // $19
        console.log('\n📊 Analysis: You are still on the STARTER plan ($19)');
        console.log('   The upgrade to Growth did not complete in Stripe');
      } else if (price.unit_amount === 4900) { // $49
        console.log('\n📊 Analysis: You are on the GROWTH plan ($49)');
        console.log('   The upgrade completed in Stripe but webhook did not process it');
      } else {
        console.log(`\n📊 Analysis: Unknown plan amount $${price.unit_amount / 100}`);
      }
    }
    
    // Check recent events for this subscription
    console.log('\n📡 Checking recent events...');
    try {
      const events = await stripe.events.list({
        type: 'customer.subscription.updated',
        limit: 10
      });
      
      console.log(`   Found ${events.data.length} recent subscription update events`);
      
      events.data.forEach((event, i) => {
        if (event.data.object.id === subscriptionId) {
          console.log(`   ${i + 1}. Event ${event.id} - ${new Date(event.created * 1000).toISOString()}`);
        }
      });
      
    } catch (error) {
      console.log(`   Error checking events: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkStripeUpgrade().catch(console.error);
