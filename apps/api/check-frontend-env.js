#!/usr/bin/env node

/**
 * Check if environment variables are loaded in frontend
 */

console.log('🔍 Checking frontend environment variables...\n');

// These would be the values loaded in the frontend
const envVars = {
  VITE_STRIPE_PRICE_PAYG: process.env.VITE_STRIPE_PRICE_PAYG,
  VITE_STRIPE_PRICE_STARTER: process.env.VITE_STRIPE_PRICE_STARTER,
  VITE_STRIPE_PRICE_GROWTH: process.env.VITE_STRIPE_PRICE_GROWTH,
  VITE_STRIPE_PRICE_SCALE: process.env.VITE_STRIPE_PRICE_SCALE
};

console.log('📋 Environment variables:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`   ${key}: ${value || 'NOT SET'}`);
});

console.log('\n🔧 Frontend PLANS array would be:');
const PLANS = [
  { key: 'PAYG', title: 'Pay As You Go', priceId: envVars.VITE_STRIPE_PRICE_PAYG },
  { key: 'STARTER', title: 'Starter', priceId: envVars.VITE_STRIPE_PRICE_STARTER },
  { key: 'GROWTH', title: 'Growth', priceId: envVars.VITE_STRIPE_PRICE_GROWTH },
  { key: 'SCALE', title: 'Scale', priceId: envVars.VITE_STRIPE_PRICE_SCALE }
];

PLANS.forEach(plan => {
  const disabled = !plan.priceId;
  console.log(`   ${plan.key}: ${plan.priceId || 'MISSING'} ${disabled ? '❌ DISABLED' : '✅ ENABLED'}`);
});

console.log('\n🎯 Analysis:');
if (!envVars.VITE_STRIPE_PRICE_GROWTH) {
  console.log('❌ Growth plan button will be DISABLED because VITE_STRIPE_PRICE_GROWTH is not set');
  console.log('   Button will show: "Set Price ID in .env"');
} else {
  console.log('✅ Growth plan button should be ENABLED');
}
