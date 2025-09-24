#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixManualSubscription() {
  console.log('🔍 Checking for manual subscriptions that need Stripe linking...\n');

  // Get subscriptions with manual price_id
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .like('price_id', 'manual:%');

  if (error) {
    console.error('❌ Error fetching subscriptions:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('✅ No manual subscriptions found!');
    return;
  }

  console.log(`📋 Found ${subscriptions.length} manual subscription(s):`);
  
  for (const sub of subscriptions) {
    console.log(`\n👤 User ID: ${sub.user_id}`);
    console.log(`📦 Price ID: ${sub.price_id}`);
    console.log(`💳 Stripe Customer ID: ${sub.stripe_customer_id || 'NULL'}`);
    console.log(`🆔 Stripe Subscription ID: ${sub.stripe_subscription_id || 'NULL'}`);
    
    // Get user profile to check what columns exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', sub.user_id)
      .single();
    
    if (profileError) {
      console.error(`❌ Error fetching profile:`, profileError);
      continue;
    }
    
    console.log(`📋 Profile data:`, profile);
    
    // Determine the correct Stripe price ID based on manual price
    let correctPriceId = null;
    if (sub.price_id === 'manual:starter') {
      correctPriceId = process.env.VITE_STRIPE_PRICE_STARTER;
    } else if (sub.price_id === 'manual:growth') {
      correctPriceId = process.env.VITE_STRIPE_PRICE_GROWTH;
    } else if (sub.price_id === 'manual:scale') {
      correctPriceId = process.env.VITE_STRIPE_PRICE_SCALE;
    }
    
    if (!correctPriceId) {
      console.log(`⚠️  No matching Stripe price ID found for ${sub.price_id}`);
      console.log(`   Available env vars:`);
      console.log(`   - VITE_STRIPE_PRICE_STARTER: ${process.env.VITE_STRIPE_PRICE_STARTER || 'Not set'}`);
      console.log(`   - VITE_STRIPE_PRICE_GROWTH: ${process.env.VITE_STRIPE_PRICE_GROWTH || 'Not set'}`);
      console.log(`   - VITE_STRIPE_PRICE_SCALE: ${process.env.VITE_STRIPE_PRICE_SCALE || 'Not set'}`);
      continue;
    }
    
    console.log(`🎯 Correct Stripe Price ID: ${correctPriceId}`);
    
    // Update the subscription with the correct price ID
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        price_id: correctPriceId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', sub.user_id);
    
    if (updateError) {
      console.error(`❌ Failed to update subscription:`, updateError);
    } else {
      console.log(`✅ Updated subscription with correct price ID: ${correctPriceId}`);
    }
  }
  
  console.log('\n🎉 Manual subscription fix completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Complete a subscription to create Stripe customer ID');
  console.log('2. Or manually create customer in Stripe Dashboard');
  console.log('3. Update profiles table with customer ID');
}

// Run the fix
fixManualSubscription().catch(console.error);