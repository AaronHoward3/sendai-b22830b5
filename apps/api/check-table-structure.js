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

async function checkProfilesTable() {
  console.log('🔍 Checking profiles table structure...\n');

  // Get a sample profile to see what columns exist
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  if (profiles && profiles.length > 0) {
    console.log('📋 Profiles table columns:');
    const columns = Object.keys(profiles[0]);
    columns.forEach(col => {
      console.log(`  - ${col}`);
    });
    
    console.log('\n📋 Sample profile data:');
    console.log(JSON.stringify(profiles[0], null, 2));
  } else {
    console.log('⚠️  No profiles found');
  }

  // Check subscriptions table
  console.log('\n📦 Checking subscriptions table...');
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('*')
    .limit(1);

  if (subsError) {
    console.error('❌ Error fetching subscriptions:', subsError);
    return;
  }

  if (subscriptions && subscriptions.length > 0) {
    console.log('📋 Subscriptions table columns:');
    const columns = Object.keys(subscriptions[0]);
    columns.forEach(col => {
      console.log(`  - ${col}`);
    });
    
    console.log('\n📋 Sample subscription data:');
    console.log(JSON.stringify(subscriptions[0], null, 2));
  } else {
    console.log('⚠️  No subscriptions found');
  }

  console.log('\n🎉 Table structure check completed!');
}

// Run the check
checkProfilesTable().catch(console.error);
