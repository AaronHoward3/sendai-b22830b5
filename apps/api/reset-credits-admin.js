#!/usr/bin/env node

/**
 * Reset credits to match current subscription using admin function
 */

import { supabase } from './utils/supabaseClient.js';
import { stripe } from './utils/stripeClient.js';

async function resetCreditsToPlan() {
  const userId = 'cb9f38df-4353-4c3a-a40f-b222014aa5c0';
  
  console.log('🔄 Resetting credits to match current subscription...');
  console.log(`   User ID: ${userId}`);
  
  try {
    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('price_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError) throw subError;
    
    if (!subscription) {
      console.log('❌ No subscription found for this user');
      return;
    }
    
    if (subscription.status !== 'active') {
      console.log(`❌ Subscription status is '${subscription.status}', not 'active'`);
      return;
    }
    
    if (!subscription.price_id) {
      console.log('❌ No price_id found in subscription');
      return;
    }
    
    console.log(`   Subscription: ${subscription.price_id} (${subscription.status})`);
    
    // Get allowances for this price
    const price = await stripe.prices.retrieve(subscription.price_id);
    const m = price.metadata || {};
    const allowances = {
      emails: parseInt(m.emails || '0', 10),
      images: parseInt(m.images || '0', 10),
      revisions: parseInt(m.revisions || '0', 10),
      brand_limit: parseInt(m.brand_limit || '0', 10)
    };
    
    console.log('📋 Plan allowances:');
    console.log(`   Emails: ${allowances.emails}`);
    console.log(`   Images: ${allowances.images}`);
    console.log(`   Revisions: ${allowances.revisions}`);
    console.log(`   Brand Limit: ${allowances.brand_limit}`);
    
    // Reset credits to match plan
    const { data: existing } = await supabase.from('credit_balances').select('*').eq('user_id', userId).maybeSingle();
    const row = existing || { user_id: userId };
    row.emails_remaining = allowances.emails;
    row.images_remaining = allowances.images;
    row.revisions_remaining = allowances.revisions;
    row.brand_limit = allowances.brand_limit;
    row.updated_at = new Date().toISOString();

    await supabase.from('credit_balances').upsert(row);
    await supabase.from('credit_ledger').insert({
      user_id: userId,
      delta_emails: allowances.emails,
      delta_images: allowances.images,
      delta_revisions: allowances.revisions,
      reason: 'reset',
      source: 'admin_reset_to_plan'
    });
    
    console.log('\n✅ Credits reset successfully!');
    console.log('   Check your app - credits should now match your plan');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

resetCreditsToPlan().catch(console.error);
