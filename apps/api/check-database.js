#!/usr/bin/env node

/**
 * Database Investigation Script
 * Check what's happening in your Supabase tables
 */

import { supabase } from './utils/supabaseClient.js';

console.log('🔍 Database Investigation\n');

async function checkStripeEvents() {
  console.log('📡 Checking stripe_events table...');
  try {
    const { data, error } = await supabase
      .from('stripe_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('❌ No webhook events found in stripe_events table');
      console.log('   This suggests webhooks are not being received or stored');
    } else {
      console.log(`✅ Found ${data.length} webhook events:`);
      data.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.created_at}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking stripe_events: ${error.message}`);
  }
}

async function checkSubscriptions() {
  console.log('\n📋 Checking subscriptions table...');
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('❌ No subscriptions found');
    } else {
      console.log(`✅ Found ${data.length} subscriptions:`);
      data.forEach((sub, i) => {
        console.log(`   ${i + 1}. User: ${sub.user_id}, Status: ${sub.status}, Price: ${sub.price_id}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking subscriptions: ${error.message}`);
  }
}

async function checkCreditBalances() {
  console.log('\n💰 Checking credit_balances table...');
  try {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('❌ No credit balances found');
    } else {
      console.log(`✅ Found ${data.length} credit balances:`);
      data.forEach((balance, i) => {
        console.log(`   ${i + 1}. User: ${balance.user_id}, Emails: ${balance.emails_remaining}, Images: ${balance.images_remaining}, Updated: ${balance.updated_at}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking credit_balances: ${error.message}`);
  }
}

async function checkCreditLedger() {
  console.log('\n📊 Checking credit_ledger table...');
  try {
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('❌ No credit ledger entries found');
    } else {
      console.log(`✅ Found ${data.length} credit ledger entries:`);
      data.forEach((entry, i) => {
        console.log(`   ${i + 1}. User: ${entry.user_id}, Reason: ${entry.reason}, Source: ${entry.source}, Emails: ${entry.delta_emails}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking credit_ledger: ${error.message}`);
  }
}

async function main() {
  await checkStripeEvents();
  await checkSubscriptions();
  await checkCreditBalances();
  await checkCreditLedger();
  
  console.log('\n🔍 Analysis:');
  console.log('1. If stripe_events is empty → Webhooks not being received');
  console.log('2. If subscriptions exist but credits not updated → Webhook processing issue');
  console.log('3. If credit_ledger shows no recent entries → Credit allocation not working');
  console.log('4. Check if user_id in subscriptions matches user_id in credit_balances');
}

main().catch(console.error);
