# Stripe Testing Guide

## 🧪 Testing Your Stripe Checkout with Metadata

This guide will help you test your Stripe checkout integration without paying real money.

### Prerequisites

1. **Stripe Account**: Make sure you have a Stripe account with test mode enabled
2. **Environment Variables**: Set up your `.env` file in `apps/api/`

### Step 1: Set Up Environment Variables

Create `apps/api/.env` with your Stripe test keys:

```bash
# Stripe Test Keys (get these from your Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (create these in Stripe Dashboard with metadata)
VITE_STRIPE_PRICE_PAYG=price_test_payg_id
VITE_STRIPE_PRICE_STARTER=price_test_starter_id
VITE_STRIPE_PRICE_GROWTH=price_test_growth_id
VITE_STRIPE_PRICE_SCALE=price_test_scale_id

# Other required vars
CLIENT_URL=http://localhost:3000
```

### Step 2: Create Test Prices with Metadata

In your Stripe Dashboard (Test Mode):

1. **Go to Products** → Create new products for each plan
2. **Add Prices** with the following metadata:

#### PAYG Plan ($9 one-time):
```
emails: 10
images: 1
revisions: 20
brand_limit: 1
kind: onetime
```

#### Starter Plan ($19/month):
```
emails: 30
images: 5
revisions: 60
brand_limit: 2
kind: recurring
```

#### Growth Plan ($49/month):
```
emails: 150
images: 25
revisions: 300
brand_limit: 5
kind: recurring
```

#### Scale Plan ($99/month):
```
emails: 300
images: 75
revisions: 900
brand_limit: 15
kind: recurring
```

### Step 3: Test the Complete Flow

#### 3.1 Start Your Servers
```bash
# Terminal 1: Start API server
cd apps/api
npm start

# Terminal 2: Start Web server  
cd apps/web
npm start

# Terminal 3: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3001/webhooks/stripe
```

#### 3.2 Test with Test Cards

1. **Navigate to**: `http://localhost:3000/settings`
2. **Click on any plan** to start checkout
3. **Use test card**: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - Name: Any name
4. **Complete checkout**

#### 3.3 Verify Results

After successful checkout:

1. **Check your database** for:
   - New entry in `credit_balances` table
   - New entry in `credit_ledger` table
   - Updated `profiles` table with `stripe_customer_id`

2. **Check Stripe Dashboard**:
   - Payment should appear in test mode
   - Customer should be created
   - Webhook events should be logged

### Step 4: Test Webhook Events Manually

#### 4.1 Test Successful Payment
```bash
# Trigger a test webhook event
stripe trigger checkout.session.completed
```

#### 4.2 Test Failed Payment
```bash
# Use declined card: 4000 0000 0000 0002
stripe trigger payment_intent.payment_failed
```

### Step 5: Debugging Tips

#### Check Webhook Logs
```bash
# View webhook events
stripe events list --limit 10
```

#### Test Webhook Endpoint Directly
```bash
# Test your webhook endpoint
curl -X POST http://localhost:3001/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### Check API Logs
Look for these log messages in your API server:
- `[API] Stripe mode: TEST`
- `[stripe] webhook verify failed` (if signature is wrong)
- `[stripe] webhook handler error` (if processing fails)

### Step 6: Common Issues & Solutions

#### Issue: "Missing price" error
**Solution**: Make sure all `VITE_STRIPE_PRICE_*` environment variables are set

#### Issue: Webhook signature verification failed
**Solution**: 
1. Make sure `STRIPE_WEBHOOK_SECRET` is correct
2. Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3001/webhooks/stripe`

#### Issue: Credits not being added
**Solution**:
1. Check that price metadata is correctly set
2. Verify webhook events are being received
3. Check database permissions for Supabase

#### Issue: Customer not found in webhook
**Solution**: Make sure `client_reference_id` is set to user ID in checkout session

### Step 7: Production Testing

Before going live:

1. **Switch to live mode** in Stripe Dashboard
2. **Update environment variables** with live keys
3. **Test with real card** (small amount)
4. **Verify webhook endpoint** is accessible from Stripe servers
5. **Test all payment scenarios** (success, failure, refund)

### Test Cards Reference

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined payment |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Insufficient funds |

### Monitoring

Set up monitoring for:
- Failed webhook deliveries
- Credit allocation errors
- Payment failures
- Database connection issues

---

## 🎯 Quick Test Checklist

- [ ] Environment variables set
- [ ] Test prices created with metadata
- [ ] API server running on port 3001
- [ ] Web server running on port 3000
- [ ] Stripe CLI forwarding webhooks
- [ ] Test checkout completed successfully
- [ ] Credits added to database
- [ ] Webhook events processed
- [ ] Error handling tested

Happy testing! 🚀
