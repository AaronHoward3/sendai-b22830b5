#!/usr/bin/env node

/**
 * Test the setPlanCredits function directly
 */

import { supabase } from './utils/supabaseClient.js';

async function testSetPlanCredits() {
  const userId = 'cb9f38df-4353-4c3a-a40f-b222014aa5c0';
  const allowances = {
    emails: 30,
    images: 5,
    revisions: 60,
    brand_limit: 2
  };
  
  console.log(`🧪 Testing setPlanCredits for user: ${userId}`);
  console.log('📋 Allowances to set:', allowances);
  
  try {
    // Step 1: Get current balance
    console.log('\n1️⃣ Getting current balance...');
    const { data: existing, error: readError } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (readError) throw readError;
    
    console.log('   Current balance:', existing);
    
    // Step 2: Prepare new row
    console.log('\n2️⃣ Preparing new row...');
    const row = existing || { user_id: userId };
    row.emails_remaining = allowances.emails;
    row.images_remaining = allowances.images;
    row.revisions_remaining = allowances.revisions;
    row.brand_limit = allowances.brand_limit;
    row.updated_at = new Date().toISOString();
    
    console.log('   New row:', row);
    
    // Step 3: Upsert credit_balances
    console.log('\n3️⃣ Upserting credit_balances...');
    const { data: balanceResult, error: balanceError } = await supabase
      .from('credit_balances')
      .upsert(row)
      .select();
    
    if (balanceError) throw balanceError;
    
    console.log('   ✅ Credit balance updated:', balanceResult);
    
    // Step 4: Insert credit_ledger entry
    console.log('\n4️⃣ Inserting credit_ledger entry...');
    const { data: ledgerResult, error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        delta_emails: allowances.emails,
        delta_images: allowances.images,
        delta_revisions: allowances.revisions,
        reason: 'reset',
        source: 'test_manual'
      })
      .select();
    
    if (ledgerError) throw ledgerError;
    
    console.log('   ✅ Credit ledger updated:', ledgerResult);
    
    // Step 5: Verify the update
    console.log('\n5️⃣ Verifying update...');
    const { data: verify, error: verifyError } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (verifyError) throw verifyError;
    
    console.log('   Final balance:', verify);
    
    if (verify.emails_remaining === allowances.emails) {
      console.log('\n✅ SUCCESS: Credits were set correctly!');
    } else {
      console.log('\n❌ FAILED: Credits were not set correctly');
      console.log(`   Expected: ${allowances.emails}, Got: ${verify.emails_remaining}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('   Details:', error);
  }
}

testSetPlanCredits().catch(console.error);
