@echo off
REM upload-placeholders.bat

echo 🚀 Uploading placeholder images to Supabase...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the apps/generator directory
    exit /b 1
)

REM Check if environment variables are set
if "%SUPABASE_URL%"=="" (
    echo ❌ Missing SUPABASE_URL environment variable
    echo Please set this in your .env file or environment
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable
    echo Please set this in your .env file or environment
    exit /b 1
)

REM Run the upload script
node scripts/upload-placeholder-images.js

echo ✅ Upload complete!
pause
