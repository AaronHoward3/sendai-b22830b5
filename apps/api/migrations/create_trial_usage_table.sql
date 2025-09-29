-- Create trial_usage table for tracking IP-based free trial usage
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast IP lookups
CREATE INDEX IF NOT EXISTS idx_trial_usage_ip_address ON trial_usage(ip_address);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_trial_usage_used_at ON trial_usage(used_at);

-- Add RLS (Row Level Security) - this table doesn't need user-specific access
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage trial records
CREATE POLICY "Service role can manage trial records" ON trial_usage
  FOR ALL USING (auth.role() = 'service_role');
