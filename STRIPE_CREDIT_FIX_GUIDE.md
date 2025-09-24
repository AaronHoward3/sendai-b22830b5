# 🚨 CRITICAL ISSUE: Credits Not Being Filled on Stripe Plan Upgrades

## 🔍 Root Cause Analysis

After investigating your Stripe webhook setup, I've identified the **primary issue** causing credits not to be filled when users upgrade their plans:

### **Issue #1: Missing Environment Variables** ⚠️
All critical environment variables are missing from your API server:
- `STRIPE_SECRET_KEY` ❌ Missing
- `STRIPE_WEBHOOK_SECRET` ❌ Missing  
- `SUPABASE_URL` ❌ Missing
- `SUPABASE_SERVICE_ROLE_KEY` ❌ Missing

**Impact**: Without these variables, the webhook cannot authenticate with Stripe or connect to Supabase, so credit updates fail silently.

### **Issue #2: Webhook Event Flow** 🔄
When a user upgrades their Stripe subscription, the following events should fire:
1. `customer.subscription.updated` - Updates subscription and resets credits
2. `invoice.paid` - Handles recurring payments and resets credits

Your webhook handlers are correctly implemented, but they can't execute without proper authentication.

## 🛠️ **IMMEDIATE FIXES REQUIRED**

### **Step 1: Set Up Environment Variables**

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

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Other required variables
OPENAI_API_KEY=your_openai_key_here
BRANDDEV_API_KEY=your_branddev_key_here
SCRAPINGBEE_API_KEY=your_scrapingbee_key_here
GENERATOR_URL=http://localhost:3002
```

### **Step 2: Get Your Stripe Keys**

1. **Stripe Secret Key**: Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) → Copy your **Secret key** (starts with `sk_test_`)
2. **Webhook Secret**: Run `stripe listen --forward-to localhost:3001/webhooks/stripe` → Copy the webhook secret (starts with `whsec_`)

### **Step 3: Create Stripe Prices with Metadata**

In your Stripe Dashboard (Test Mode), create prices with this metadata:

#### **Starter Plan ($19/month)**:
```
emails: 30
images: 5
revisions: 60
brand_limit: 2
kind: recurring
```

#### **Growth Plan ($49/month)**:
```
emails: 150
images: 25
revisions: 300
brand_limit: 5
kind: recurring
```

#### **Scale Plan ($99/month)**:
```
emails: 300
images: 75
revisions: 900
brand_limit: 15
kind: recurring
```

### **Step 4: Test the Fix**

1. **Start your servers**:
   ```bash
   # Terminal 1: API Server
   cd apps/api
   npm start
   
   # Terminal 2: Web Server  
   cd apps/web
   npm start
   
   # Terminal 3: Stripe CLI
   stripe listen --forward-to localhost:3001/webhooks/stripe
   ```

2. **Test subscription upgrade**:
   - Go to `http://localhost:3000/settings`
   - Upgrade to a higher plan
   - Use test card: `4242 4242 4242 4242`
   - Check your database for updated credits

3. **Run diagnostic script**:
   ```bash
   cd apps/api
   node diagnose-credit-issue.js
   ```

## 🔧 **Webhook Event Flow**

Your webhook handlers are correctly implemented:

```javascript
// When subscription is updated (upgrade/downgrade)
case 'customer.subscription.updated':
  await handleSubscriptionChange(event.data.object);
  break;

// When recurring payment is made
case 'invoice.paid':
  await handleInvoicePaid(event.data.object);
  break;
```

The `handleSubscriptionChange` function properly:
1. Retrieves user ID from Stripe customer metadata
2. Gets the new price ID from subscription items
3. Fetches allowances from price metadata
4. Resets credits to match the new plan

## 🚨 **Critical Points**

1. **User ID Mapping**: Ensure `user_id` is set in Stripe customer metadata when creating customers
2. **Price Metadata**: All prices must have the required metadata fields
3. **Webhook Secret**: Must match between Stripe CLI and your environment
4. **Database Permissions**: Supabase service role key must have write permissions

## 📊 **Verification Checklist**

- [ ] Environment variables set correctly
- [ ] Stripe prices created with proper metadata
- [ ] Webhook endpoint receiving events (check Stripe CLI output)
- [ ] Database permissions working
- [ ] User IDs properly mapped in Stripe customer metadata

## 🎯 **Expected Behavior After Fix**

When a user upgrades their subscription:
1. Stripe sends `customer.subscription.updated` webhook
2. Your API receives the event and authenticates it
3. Function retrieves new price metadata
4. Credits are reset to match the new plan
5. Database is updated with new credit balances

The issue is **environment configuration**, not code logic. Once you set up the environment variables correctly, the credit system should work as expected.
