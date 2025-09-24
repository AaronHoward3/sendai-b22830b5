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

async function debugCustomerIssue() {
  console.log('🔍 Debugging customer ID issue...\n');

  // Get all profiles with stripe_customer_id
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, stripe_customer_id, display_name')
    .not('stripe_customer_id', 'is', null);

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
    return;
  }

  console.log(`📋 Profiles with Stripe customer IDs (${profiles?.length || 0}):`);
  profiles?.forEach(profile => {
    console.log(`  👤 ${profile.user_id} - ${profile.display_name} - ${profile.stripe_customer_id}`);
  });

  // Get all subscriptions
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('user_id, stripe_customer_id, stripe_subscription_id, price_id, status')
    .not('stripe_subscription_id', 'is', null);

  if (subsError) {
    console.error('❌ Error fetching subscriptions:', subsError);
    return;
  }

  console.log(`\n📦 Subscriptions with Stripe IDs (${subscriptions?.length || 0}):`);
  subscriptions?.forEach(sub => {
    console.log(`  📦 ${sub.user_id} - ${sub.stripe_customer_id} - ${sub.stripe_subscription_id} - ${sub.price_id} - ${sub.status}`);
  });

  // Check for mismatches
  console.log('\n🔍 Checking for mismatches...');
  
  if (profiles && subscriptions) {
    for (const profile of profiles) {
      const matchingSub = subscriptions.find(sub => sub.user_id === profile.user_id);
      if (matchingSub) {
        if (profile.stripe_customer_id !== matchingSub.stripe_customer_id) {
          console.log(`⚠️  MISMATCH: Profile customer ID (${profile.stripe_customer_id}) != Subscription customer ID (${matchingSub.stripe_customer_id}) for user ${profile.user_id}`);
        } else {
          console.log(`✅ MATCH: User ${profile.user_id} has consistent customer ID (${profile.stripe_customer_id})`);
        }
      } else {
        console.log(`⚠️  Profile has customer ID but no matching subscription for user ${profile.user_id}`);
      }
    }
  }

  // Check for users with subscriptions but no profile customer ID
  if (profiles && subscriptions) {
    for (const sub of subscriptions) {
      const matchingProfile = profiles.find(profile => profile.user_id === sub.user_id);
      if (!matchingProfile) {
        console.log(`⚠️  Subscription exists but no profile customer ID for user ${sub.user_id}`);
      }
    }
  }

  console.log('\n🎉 Debug completed!');
}

// Run the debug
debugCustomerIssue().catch(console.error);
