#!/usr/bin/env node

/**
 * Check your specific customer's checkout sessions
 */

import { stripe } from './utils/stripeClient.js';

async function checkMyCustomerSessions() {
  const customerId = 'cus_T6Rr2S6Z2m1cNX'; // Your customer ID
  
  console.log('🔍 Checking checkout sessions for your customer...');
  console.log(`   Customer ID: ${customerId}\n`);
  
  try {
    // Get all checkout sessions for your customer
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 20
    });
    
    console.log(`📋 Found ${sessions.data.length} checkout sessions:`);
    
    sessions.data.forEach((session, i) => {
      console.log(`   ${i + 1}. ${session.id}`);
      console.log(`      Status: ${session.payment_status}`);
      console.log(`      Mode: ${session.mode}`);
      console.log(`      Created: ${new Date(session.created * 1000).toISOString()}`);
      console.log(`      Success URL: ${session.success_url}`);
      console.log(`      Cancel URL: ${session.cancel_url}`);
      
      if (session.line_items && session.line_items.data.length > 0) {
        const item = session.line_items.data[0];
        console.log(`      Price: ${item.price.id} - $${item.price.unit_amount / 100}`);
      }
      
      if (session.subscription) {
        console.log(`      Subscription: ${session.subscription}`);
      }
      
      console.log('');
    });
    
    // Check if there are any incomplete sessions
    const incompleteSessions = sessions.data.filter(s => 
      s.payment_status === 'unpaid' || 
      s.status === 'open' || 
      s.status === 'expired'
    );
    
    if (incompleteSessions.length > 0) {
      console.log('⚠️  Found incomplete sessions:');
      incompleteSessions.forEach(session => {
        console.log(`   - ${session.id}: ${session.status} (${session.payment_status})`);
      });
    }
    
    // Check your customer's subscriptions
    console.log('\n📋 Your customer subscriptions:');
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10
    });
    
    subscriptions.data.forEach((sub, i) => {
      console.log(`   ${i + 1}. ${sub.id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Created: ${new Date(sub.created * 1000).toISOString()}`);
      console.log(`      Current period: ${new Date(sub.current_period_start * 1000).toISOString()} to ${new Date(sub.current_period_end * 1000).toISOString()}`);
      
      if (sub.items.data.length > 0) {
        const item = sub.items.data[0];
        console.log(`      Price: ${item.price.id} - $${item.price.unit_amount / 100}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkMyCustomerSessions().catch(console.error);
