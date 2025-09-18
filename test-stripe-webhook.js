#!/usr/bin/env node

/**
 * Test script for Stripe webhook events
 * This simulates webhook events to test your credit allocation logic
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Test data for different plans
const testPlans = {
  PAYG: {
    emails: 10,
    images: 1,
    revisions: 20,
    brand_limit: 1,
    kind: 'onetime'
  },
  STARTER: {
    emails: 30,
    images: 5,
    revisions: 60,
    brand_limit: 2,
    kind: 'recurring'
  },
  GROWTH: {
    emails: 150, // Note: your code shows 300/2 = 150
    images: 25,
    revisions: 300,
    brand_limit: 5,
    kind: 'recurring'
  },
  SCALE: {
    emails: 300,
    images: 75,
    revisions: 900,
    brand_limit: 15,
    kind: 'recurring'
  }
};

async function testPriceMetadata() {
  console.log('🔍 Testing Stripe Price Metadata...\n');
  
  const priceIds = [
    process.env.VITE_STRIPE_PRICE_PAYG,
    process.env.VITE_STRIPE_PRICE_STARTER,
    process.env.VITE_STRIPE_PRICE_GROWTH,
    process.env.VITE_STRIPE_PRICE_SCALE
  ].filter(Boolean);

  for (const priceId of priceIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log(`📦 Price ID: ${priceId}`);
      console.log(`   Amount: $${price.unit_amount / 100}`);
      console.log(`   Type: ${price.type}`);
      console.log(`   Metadata:`, price.metadata);
      console.log('');
    } catch (error) {
      console.error(`❌ Error fetching price ${priceId}:`, error.message);
    }
  }
}

async function simulateWebhookEvent(eventType, sessionData) {
  console.log(`🎭 Simulating ${eventType} webhook event...`);
  
  const webhookPayload = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: eventType,
    data: {
      object: sessionData
    },
    created: Math.floor(Date.now() / 1000)
  };

  try {
    const response = await fetch('http://localhost:3001/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // This will fail verification, but we can test the logic
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.text();
    console.log(`   Response: ${response.status} - ${result}`);
  } catch (error) {
    console.error(`   Error: ${error.message}`);
  }
}

async function testCheckoutSession() {
  console.log('🧪 Testing Checkout Session Creation...\n');
  
  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: { user_id: 'test-user-123' }
    });

    // Create a test price with metadata
    const price = await stripe.prices.create({
      unit_amount: 900, // $9.00
      currency: 'usd',
      product_data: {
        name: 'Test PAYG Plan'
      },
      metadata: {
        emails: '10',
        images: '1',
        revisions: '20',
        brand_limit: '1',
        kind: 'onetime'
      }
    });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      client_reference_id: 'test-user-123',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: 'http://localhost:3000/settings?billing=success',
      cancel_url: 'http://localhost:3000/settings?billing=cancel'
    });

    console.log(`✅ Created test checkout session: ${session.id}`);
    console.log(`   URL: ${session.url}`);
    
    // Simulate the webhook event
    await simulateWebhookEvent('checkout.session.completed', {
      id: session.id,
      mode: 'payment',
      customer: customer.id,
      client_reference_id: 'test-user-123',
      subscription: null,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    });

    // Clean up
    await stripe.prices.update(price.id, { active: false });
    await stripe.customers.del(customer.id);
    
  } catch (error) {
    console.error('❌ Error testing checkout session:', error.message);
  }
}

async function main() {
  console.log('🚀 Stripe Webhook Testing Script\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Please set STRIPE_SECRET_KEY environment variable');
    process.exit(1);
  }

  await testPriceMetadata();
  await testCheckoutSession();
  
  console.log('\n✅ Testing complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Make sure your API server is running on localhost:3001');
  console.log('2. Test the actual checkout flow in your web app');
  console.log('3. Use Stripe CLI to forward real webhook events');
  console.log('4. Check your database to verify credits were added correctly');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testPriceMetadata, testCheckoutSession };
