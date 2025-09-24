#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { Stripe } from 'stripe';
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function diagnoseBillingPortal() {
  console.log('🔍 Diagnosing billing portal issues...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set'}`);
  console.log(`- CLIENT_URL: ${process.env.CLIENT_URL || 'Not set'}`);
  console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'}\n`);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ STRIPE_SECRET_KEY not set - cannot test Stripe API');
    return;
  }

  // Get all users with stripe_customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, stripe_customer_id')
    .not('stripe_customer_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles with Stripe customer IDs found');
    return;
  }

  console.log(`📋 Found ${profiles.length} profile(s) with Stripe customer IDs:`);

  for (const profile of profiles) {
    console.log(`\n👤 User ID: ${profile.user_id}`);
    console.log(`💳 Stripe Customer ID: ${profile.stripe_customer_id}`);

    try {
      // Test if the customer exists in Stripe
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      console.log(`✅ Customer exists in Stripe:`);
      console.log(`   - Email: ${customer.email || 'No email'}`);
      console.log(`   - Created: ${new Date(customer.created * 1000).toISOString()}`);
      console.log(`   - Metadata:`, customer.metadata);

      // Check if customer has any subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        limit: 10
      });

      console.log(`📦 Subscriptions: ${subscriptions.data.length}`);
      for (const sub of subscriptions.data) {
        console.log(`   - ID: ${sub.id}`);
        console.log(`   - Status: ${sub.status}`);
        console.log(`   - Current period end: ${new Date(sub.current_period_end * 1000).toISOString()}`);
      }

      // Test creating a billing portal session
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: `${process.env.CLIENT_URL || 'https://www.irios.ai'}/settings`
        });
        console.log(`✅ Billing portal session created successfully:`);
        console.log(`   - URL: ${portal.url}`);
        console.log(`   - Return URL: ${portal.return_url}`);
      } catch (portalError) {
        console.error(`❌ Failed to create billing portal session:`, portalError.message);
        
        // Check if billing portal is configured
        try {
          const configurations = await stripe.billingPortal.configurations.list({ limit: 10 });
          console.log(`📋 Billing portal configurations: ${configurations.data.length}`);
          if (configurations.data.length === 0) {
            console.log(`⚠️  No billing portal configurations found - this might be the issue!`);
            console.log(`   You need to create a billing portal configuration in Stripe Dashboard`);
          }
        } catch (configError) {
          console.error(`❌ Error checking billing portal configurations:`, configError.message);
        }
      }

    } catch (customerError) {
      console.error(`❌ Customer not found in Stripe:`, customerError.message);
    }
  }

  console.log('\n🎉 Billing portal diagnosis completed!');
}

// Run the diagnosis
diagnoseBillingPortal().catch(console.error);
