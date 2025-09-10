-- Reset trial usage for development/testing
-- Run this in your Supabase SQL editor

-- Option 1: Clear all trial records
DELETE FROM trial_usage;

-- Option 2: Clear only your specific IP (replace with your IP)
-- DELETE FROM trial_usage WHERE ip_address = 'YOUR_IP_HERE';

-- Option 3: Clear records older than 1 hour (keeps recent legitimate blocks)
-- DELETE FROM trial_usage WHERE used_at < NOW() - INTERVAL '1 hour';

-- Check current records
SELECT * FROM trial_usage ORDER BY used_at DESC LIMIT 10;
