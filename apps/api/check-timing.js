#!/usr/bin/env node

/**
 * Check timing of webhook events vs metadata updates
 */

import { supabase } from './utils/supabaseClient.js';

async function checkTiming() {
  console.log('🕐 Checking timing of events...\n');
  
  try {
    // Get recent credit ledger entries
    const { data: ledger, error: ledgerError } = await supabase
      .from('credit_ledger')
      .select('*')
      .eq('user_id', 'cb9f38df-4353-4c3a-a40f-b222014aa5c0')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ledgerError) throw ledgerError;
    
    console.log('📊 Recent credit ledger entries:');
    ledger.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.created_at}`);
      console.log(`      Source: ${entry.source}`);
      console.log(`      Reason: ${entry.reason}`);
      console.log(`      Emails: ${entry.delta_emails}`);
      console.log(`      Images: ${entry.delta_images}`);
      console.log('');
    });
    
    // Get recent subscription updates
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', 'cb9f38df-4353-4c3a-a40f-b222014aa5c0')
      .order('updated_at', { ascending: false })
      .limit(3);
    
    if (subError) throw subError;
    
    console.log('📋 Recent subscription updates:');
    subs.forEach((sub, i) => {
      console.log(`   ${i + 1}. ${sub.updated_at}`);
      console.log(`      Price: ${sub.price_id}`);
      console.log(`      Status: ${sub.status}`);
      console.log('');
    });
    
    console.log('🔍 Analysis:');
    console.log('1. Check if the webhook processed BEFORE you updated the metadata');
    console.log('2. If so, the webhook used the old (empty) metadata');
    console.log('3. Solution: Trigger a new webhook event or manually reset credits');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkTiming().catch(console.error);
