#!/usr/bin/env node

/**
 * Script to manually reset a user's credits to match their current subscription plan
 * Usage: node reset-user-credits.js <user_id>
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

async function getAllowances(priceId) {
  const price = await stripe.prices.retrieve(priceId);
  const m = price.metadata || {};
  return {
    kind: m.kind || (price.type === 'one_time' ? 'onetime' : 'recurring'),
    emails: parseInt(m.emails || '0', 10),
    images: parseInt(m.images || '0', 10),
    revisions: parseInt(m.revisions || '0', 10),
    brand_limit: parseInt(m.brand_limit || '0', 10)
  };
}

async function setPlanCredits(userId, allowances, reason) {
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
    source: reason
  });
}

async function resetUserCredits(userId) {
  try {
    console.log(`🔄 Resetting credits for user: ${userId}`);
    
    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('price_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError) {
      console.error('❌ Error fetching subscription:', subError.message);
      return;
    }
    
    if (!subscription) {
      console.log('ℹ️  No active subscription found for this user');
      return;
    }
    
    if (subscription.status !== 'active') {
      console.log(`ℹ️  Subscription status is '${subscription.status}', not 'active'`);
      return;
    }
    
    if (!subscription.price_id) {
      console.log('ℹ️  No price_id found in subscription');
      return;
    }
    
    console.log(`📋 Found active subscription with price_id: ${subscription.price_id}`);
    
    // Get allowances for this price
    const allowances = await getAllowances(subscription.price_id);
    console.log('💰 Plan allowances:', allowances);
    
    // Reset credits
    await setPlanCredits(userId, allowances, 'manual_reset_script');
    
    console.log('✅ Credits reset successfully!');
    console.log(`   Emails: ${allowances.emails}`);
    console.log(`   Images: ${allowances.images}`);
    console.log(`   Revisions: ${allowances.revisions}`);
    console.log(`   Brand Limit: ${allowances.brand_limit}`);
    
  } catch (error) {
    console.error('❌ Error resetting credits:', error.message);
  }
}

// Main execution
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: node reset-user-credits.js <user_id>');
  console.error('   Example: node reset-user-credits.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

resetUserCredits(userId).then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
