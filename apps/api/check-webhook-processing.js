#!/usr/bin/env node

/**
 * Check what happens during webhook processing
 */

import { supabase } from './utils/supabaseClient.js';
import { stripe } from './utils/stripeClient.js';

async function checkWebhookProcessing() {
  const userId = 'cb9f38df-4353-4c3a-a40f-b222014aa5c0';
  
  console.log('🔍 Checking webhook processing for user:', userId);
  
  try {
    // Get the user's subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError) throw subError;
    
    if (!sub) {
      console.log('❌ No subscription found');
      return;
    }
    
    console.log('\n📋 Current subscription:');
    console.log(`   Status: ${sub.status}`);
    console.log(`   Price ID: ${sub.price_id}`);
    console.log(`   Stripe Subscription ID: ${sub.stripe_subscription_id}`);
    
    // Get the actual Stripe subscription to see what it contains
    if (sub.stripe_subscription_id) {
      console.log('\n🔍 Fetching actual Stripe subscription...');
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        
        console.log('📦 Stripe subscription details:');
        console.log(`   Status: ${stripeSub.status}`);
        console.log(`   Customer: ${stripeSub.customer}`);
        console.log(`   Items count: ${stripeSub.items.data.length}`);
        
        if (stripeSub.items.data.length > 0) {
          const item = stripeSub.items.data[0];
          console.log(`   First item price ID: ${item.price.id}`);
          
          // Check if this price ID matches what we expect
          if (item.price.id !== sub.price_id) {
            console.log(`   ⚠️  MISMATCH: DB has ${sub.price_id}, Stripe has ${item.price.id}`);
          } else {
            console.log(`   ✅ Price IDs match`);
          }
          
          // Get metadata for the actual price
          console.log('\n💰 Checking price metadata from Stripe subscription...');
          const price = await stripe.prices.retrieve(item.price.id);
          const metadata = price.metadata || {};
          
          console.log('📋 Price metadata:');
          console.log(`   emails: ${metadata.emails || 'MISSING'}`);
          console.log(`   images: ${metadata.images || 'MISSING'}`);
          console.log(`   revisions: ${metadata.revisions || 'MISSING'}`);
          console.log(`   brand_limit: ${metadata.brand_limit || 'MISSING'}`);
          
          // Test what getAllowances would return
          const allowances = {
            kind: metadata.kind || (price.type === 'one_time' ? 'onetime' : 'recurring'),
            emails: parseInt(metadata.emails || '0', 10),
            images: parseInt(metadata.images || '0', 10),
            revisions: parseInt(metadata.revisions || '0', 10),
            brand_limit: parseInt(metadata.brand_limit || '0', 10)
          };
          
          console.log('\n🔧 What getAllowances would return:');
          console.log(`   emails: ${allowances.emails}`);
          console.log(`   images: ${allowances.images}`);
          console.log(`   revisions: ${allowances.revisions}`);
          console.log(`   brand_limit: ${allowances.brand_limit}`);
          
        }
        
      } catch (error) {
        console.log(`❌ Error fetching Stripe subscription: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkWebhookProcessing().catch(console.error);
