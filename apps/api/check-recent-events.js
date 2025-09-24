#!/usr/bin/env node

/**
 * Check recent Stripe events and webhook processing
 */

import { stripe } from './utils/stripeClient.js';

async function checkRecentEvents() {
  console.log('🔍 Checking recent Stripe events...\n');
  
  try {
    // Check recent checkout sessions
    console.log('🛒 Recent checkout sessions:');
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    });
    
    sessions.data.forEach((session, i) => {
      console.log(`   ${i + 1}. ${session.id}`);
      console.log(`      Status: ${session.payment_status}`);
      console.log(`      Mode: ${session.mode}`);
      console.log(`      Customer: ${session.customer}`);
      console.log(`      Created: ${new Date(session.created * 1000).toISOString()}`);
      
      if (session.line_items && session.line_items.data.length > 0) {
        const item = session.line_items.data[0];
        console.log(`      Price: ${item.price.id} - $${item.price.unit_amount / 100}`);
      }
      console.log('');
    });
    
    // Check recent subscription events
    console.log('📡 Recent subscription events:');
    const events = await stripe.events.list({
      type: 'customer.subscription.updated',
      limit: 5
    });
    
    events.data.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.id}`);
      console.log(`      Created: ${new Date(event.created * 1000).toISOString()}`);
      console.log(`      Subscription: ${event.data.object.id}`);
      console.log(`      Status: ${event.data.object.status}`);
      console.log('');
    });
    
    // Check for failed payments
    console.log('💳 Recent payment intents:');
    const payments = await stripe.paymentIntents.list({
      limit: 10
    });
    
    payments.data.forEach((payment, i) => {
      if (payment.status === 'requires_payment_method' || payment.status === 'canceled') {
        console.log(`   ${i + 1}. ${payment.id}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Amount: $${payment.amount / 100}`);
        console.log(`      Created: ${new Date(payment.created * 1000).toISOString()}`);
        console.log(`      Last error: ${payment.last_payment_error?.message || 'None'}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkRecentEvents().catch(console.error);
