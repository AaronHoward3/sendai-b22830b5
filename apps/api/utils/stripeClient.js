import 'dotenv/config';
import Stripe from 'stripe';

const rawKey = process.env.STRIPE_SECRET_KEY;
const key = rawKey ? rawKey.trim() : '';

if (!key) {
  throw new Error('STRIPE_SECRET_KEY is missing. Set it in apps/api/.env');
}
if (!/^sk_(test|live)_/.test(key)) {
  console.warn('⚠️ STRIPE_SECRET_KEY does not look like a valid sk_test_/sk_live_ key.');
}

export const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

// Optional: tiny mode hint (safe)
console.log(`[API] Stripe mode: ${key.startsWith('sk_live_') ? 'LIVE' : 'TEST'}`);
