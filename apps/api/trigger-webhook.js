#!/usr/bin/env node

/**
 * Manually trigger a subscription update webhook
 */

import { stripe } from './utils/stripeClient.js';

async function triggerSubscriptionUpdate() {
  const subscriptionId = 'sub_1SAEyLEFkIBODi7iQMe937Dl';
  
  console.log('🔄 Triggering subscription update webhook...');
  console.log(`   Subscription ID: ${subscriptionId}`);
  
  try {
    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('📦 Current subscription:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Customer: ${subscription.customer}`);
    console.log(`   Price: ${subscription.items.data[0].price.id}`);
    
    // Create a webhook event payload
    const webhookPayload = {
      id: `evt_manual_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: subscription
      },
      created: Math.floor(Date.now() / 1000)
    };
    
    console.log('\n📡 Sending webhook event...');
    
    // Send to your webhook endpoint
    const response = await fetch('http://localhost:3001/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'manual_trigger' // This will fail verification, but we can test the logic
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.text();
    console.log(`   Response: ${response.status} - ${result}`);
    
    if (response.status === 200) {
      console.log('\n✅ Webhook event sent successfully!');
      console.log('   Check your database to see if credits were updated');
    } else {
      console.log('\n❌ Webhook event failed');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

triggerSubscriptionUpdate().catch(console.error);
