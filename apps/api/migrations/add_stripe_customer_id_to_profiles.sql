-- Add stripe_customer_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Update existing profiles with stripe_customer_id from subscriptions table
-- This will populate the stripe_customer_id for users who already have subscriptions
UPDATE profiles 
SET stripe_customer_id = sub.stripe_customer_id,
    updated_at = NOW()
FROM subscriptions sub 
WHERE profiles.user_id = sub.user_id 
  AND sub.stripe_customer_id IS NOT NULL 
  AND profiles.stripe_customer_id IS NULL;
