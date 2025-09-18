# 🔧 Stripe Webhook Setup Guide

## Current Status
✅ Stripe CLI is running and forwarding webhooks  
✅ Webhook endpoint is configured at `/webhooks/stripe`  
✅ Webhook secret is available: `whsec_your_webhook_secret_here`  
❌ Environment variables are NOT set  

## What You Need to Fix

### 1. Create Environment File
Create `apps/api/.env` with the following content:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Client URL
CLIENT_URL=http://localhost:3000

# Price IDs (create these in Stripe Dashboard)
VITE_STRIPE_PRICE_PAYG=price_test_payg_id
VITE_STRIPE_PRICE_STARTER=price_test_starter_id
VITE_STRIPE_PRICE_GROWTH=price_test_growth_id
VITE_STRIPE_PRICE_SCALE=price_test_scale_id

# Other required variables (add your actual keys)
OPENAI_API_KEY=your_openai_key_here
BRANDDEV_API_KEY=your_branddev_key_here
SCRAPINGBEE_API_KEY=your_scrapingbee_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
GENERATOR_URL=http://localhost:3002
```

### 2. Get Your Stripe Secret Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Replace `sk_test_your_stripe_secret_key_here` in the .env file

### 3. Create Test Prices with Metadata
In your Stripe Dashboard (Test Mode):

#### PAYG Plan ($9 one-time):
1. Go to Products → Create Product
2. Name: "PAYG Plan"
3. Add Price: $9.00, one-time
4. **Add Metadata**:
   ```
   emails: 10
   images: 1
   revisions: 20
   brand_limit: 1
   kind: onetime
   ```
5. Copy the Price ID and update `VITE_STRIPE_PRICE_PAYG`

#### Starter Plan ($19/month):
1. Create Product: "Starter Plan"
2. Add Price: $19.00, recurring monthly
3. **Add Metadata**:
   ```
   emails: 30
   images: 5
   revisions: 60
   brand_limit: 2
   kind: recurring
   ```
4. Copy the Price ID and update `VITE_STRIPE_PRICE_STARTER`

#### Growth Plan ($49/month):
1. Create Product: "Growth Plan"
2. Add Price: $49.00, recurring monthly
3. **Add Metadata**:
   ```
   emails: 150
   images: 25
   revisions: 300
   brand_limit: 5
   kind: recurring
   ```
4. Copy the Price ID and update `VITE_STRIPE_PRICE_GROWTH`

#### Scale Plan ($99/month):
1. Create Product: "Scale Plan"
2. Add Price: $99.00, recurring monthly
3. **Add Metadata**:
   ```
   emails: 300
   images: 75
   revisions: 900
   brand_limit: 15
   kind: recurring
   ```
4. Copy the Price ID and update `VITE_STRIPE_PRICE_SCALE`

### 4. Test Your Setup

#### Start Your Servers:
```bash
# Terminal 1: API Server
cd apps/api
npm start

# Terminal 2: Web Server
cd apps/web
npm start

# Terminal 3: Stripe CLI (already running)
stripe listen --forward-to localhost:3001/webhooks/stripe
```

#### Test the Checkout Flow:
1. Go to `http://localhost:3000/settings`
2. Click on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check your database for new credits

#### Test Webhook Events:
```bash
# Trigger a test event
stripe trigger checkout.session.completed
```

### 5. Verify Everything Works

After setting up the .env file, restart your API server and check the logs. You should see:
```
🔐 API Keys / Config:
- STRIPE_SECRET_KEY: ✅ yes
- STRIPE_WEBHOOK_SECRET: ✅ yes
```

### 6. Common Issues

#### "Webhook signature verification failed"
- Make sure `STRIPE_WEBHOOK_SECRET` matches the one from Stripe CLI
- Restart your API server after updating .env

#### "Missing price" error
- Make sure all `VITE_STRIPE_PRICE_*` variables are set
- Verify the price IDs exist in Stripe Dashboard

#### Credits not being added
- Check that price metadata is correctly set
- Verify webhook events are being received (check Stripe CLI output)
- Check database permissions

## Next Steps

1. ✅ Create `apps/api/.env` file
2. ✅ Add your Stripe secret key
3. ✅ Create test prices with metadata
4. ✅ Test checkout flow
5. ✅ Verify credits are added

Your webhook endpoint is correctly configured - you just need the environment variables! 🚀
