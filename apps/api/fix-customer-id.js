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

async function fixCustomerId() {
  console.log('🔍 Checking for users without Stripe customer IDs...\n');

  // Get all users without stripe_customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, email, stripe_customer_id')
    .is('stripe_customer_id', null);

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ All users have Stripe customer IDs!');
    return;
  }

  console.log(`📋 Found ${profiles.length} users without Stripe customer IDs:`);
  
  for (const profile of profiles) {
    console.log(`\n👤 User: ${profile.user_id}`);
    console.log(`📧 Email: ${profile.email || 'No email'}`);
    
    // Check if user has any Stripe customers with this email
    if (profile.email) {
      try {
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 10
        });
        
        if (customers.data.length > 0) {
          console.log(`🔍 Found ${customers.data.length} Stripe customer(s) with this email`);
          
          // Use the first customer (most recent)
          const customer = customers.data[0];
          console.log(`💳 Customer ID: ${customer.id}`);
          
          // Update the profile with the customer ID
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              stripe_customer_id: customer.id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', profile.user_id);
          
          if (updateError) {
            console.error(`❌ Failed to update profile:`, updateError);
          } else {
            console.log(`✅ Updated profile with customer ID: ${customer.id}`);
          }
        } else {
          console.log(`⚠️  No Stripe customers found with this email`);
          
          // Create a new Stripe customer
          try {
            const customer = await stripe.customers.create({
              email: profile.email,
              metadata: { user_id: profile.user_id }
            });
            
            console.log(`🆕 Created new Stripe customer: ${customer.id}`);
            
            // Update the profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                stripe_customer_id: customer.id,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.user_id);
            
            if (updateError) {
              console.error(`❌ Failed to update profile:`, updateError);
            } else {
              console.log(`✅ Updated profile with new customer ID: ${customer.id}`);
            }
          } catch (createError) {
            console.error(`❌ Failed to create Stripe customer:`, createError);
          }
        }
      } catch (stripeError) {
        console.error(`❌ Stripe API error:`, stripeError);
      }
    } else {
      console.log(`⚠️  No email address - cannot create Stripe customer`);
    }
  }
  
  console.log('\n🎉 Customer ID fix completed!');
}

// Run the fix
fixCustomerId().catch(console.error);
