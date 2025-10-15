#!/bin/bash
# upload-placeholders.sh

echo "🚀 Uploading placeholder images to Supabase..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this script from the apps/generator directory"
  exit 1
fi

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  echo "Please set these in your .env file or environment"
  exit 1
fi

# Run the upload script
node scripts/upload-placeholder-images.js

echo "✅ Upload complete!"
