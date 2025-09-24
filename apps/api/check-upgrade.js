#!/usr/bin/env node

/**
 * Check what happens during subscription upgrade
 */

import { supabase } from './utils/supabaseClient.js';
import { stripe } from './utils/stripeClient.js';

async function checkRecentActivity() {
  console.log('🔍 Checking recent subscription and credit activity...\n');
  
  // Check recent subscriptions
  console.log('📋 Recent Subscriptions:');
  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    subs.forEach((sub, i) => {
      console.log(`   ${i + 1}. User: ${sub.user_id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Price: ${sub.price_id}`);
      console.log(`      Updated: ${sub.updated_at}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Check recent credit ledger entries
  console.log('📊 Recent Credit Ledger:');
  try {
    const { data: ledger, error } = await supabase
      .from('credit_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    ledger.forEach((entry, i) => {
      console.log(`   ${i + 1}. User: ${entry.user_id}`);
      console.log(`      Reason: ${entry.reason}`);
      console.log(`      Source: ${entry.source}`);
      console.log(`      Emails: ${entry.delta_emails}`);
      console.log(`      Images: ${entry.delta_images}`);
      console.log(`      Created: ${entry.created_at}`);
      console.log('');
    });
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function checkSpecificUser(userId) {
  console.log(`\n👤 Checking specific user: ${userId}\n`);
  
  // Get user's current subscription
  try {
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError) throw subError;
    
    if (sub) {
      console.log('📋 Current Subscription:');
      console.log(`   Status: ${sub.status}`);
      console.log(`   Price ID: ${sub.price_id}`);
      console.log(`   Updated: ${sub.updated_at}`);
      
      // Check what this price should give
      if (sub.price_id) {
        console.log('\n💰 Price Metadata:');
        try {
          const price = await stripe.prices.retrieve(sub.price_id);
          const metadata = price.metadata || {};
          console.log(`   Amount: $${price.unit_amount / 100}`);
          console.log(`   Emails: ${metadata.emails || 'MISSING'}`);
          console.log(`   Images: ${metadata.images || 'MISSING'}`);
          console.log(`   Revisions: ${metadata.revisions || 'MISSING'}`);
          console.log(`   Brand Limit: ${metadata.brand_limit || 'MISSING'}`);
        } catch (error) {
          console.log(`   ❌ Error fetching price: ${error.message}`);
        }
      }
    } else {
      console.log('❌ No subscription found for this user');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Get user's current credits
  try {
    const { data: credits, error: creditError } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (creditError) throw creditError;
    
    if (credits) {
      console.log('\n💳 Current Credits:');
      console.log(`   Emails: ${credits.emails_remaining}`);
      console.log(`   Images: ${credits.images_remaining}`);
      console.log(`   Revisions: ${credits.revisions_remaining}`);
      console.log(`   Brand Limit: ${credits.brand_limit}`);
      console.log(`   Updated: ${credits.updated_at}`);
    } else {
      console.log('❌ No credit balance found for this user');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  await checkRecentActivity();
  
  // Check the user who just upgraded (you can replace this with your actual user ID)
  const testUserId = 'cb9f38df-4353-4c3a-a40f-b222014aa5c0'; // Replace with your user ID
  await checkSpecificUser(testUserId);
  
  console.log('\n🔍 Analysis:');
  console.log('1. Check if the subscription price_id changed');
  console.log('2. Check if credit_ledger shows a recent "reset" entry');
  console.log('3. Check if the new price has correct metadata');
  console.log('4. If subscription updated but credits didn\'t, webhook might not be firing');
}

main().catch(console.error);
