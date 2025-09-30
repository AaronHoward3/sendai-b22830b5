# Local Testing Guide for Authentication

This guide explains how to test your application locally when users are logged in, especially with magic link authentication.

## The Problem

Magic link authentication redirects users to your production domain, making it difficult to test locally. When you click a magic link in development, it redirects to your production site instead of your local development server.

## Solutions

### Solution 1: Configure Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to Authentication → URL Configuration
   
2. **Add Site URLs:**
   ```
   http://localhost:5173
   http://localhost:3000
   http://localhost:8080
   ```

3. **Add Redirect URLs:**
   ```
    **
   http://localhost:3000/**
   http://localhost:8080/**
   ```

4. **Save the configuration**

### Solution 2: Manual Trial Bypass

For testing without trial restrictions, you can manually set development flags:

- **Trial Bypass**: `localStorage.setItem('dev_override_trial', 'true')`
- **Clear Flags**: `localStorage.removeItem('dev_override_trial')`

### Solution 3: Environment-Based Redirects

The code now automatically handles redirect URLs based on environment:

- **Development**: Uses `window.location.origin` (localhost)
- **Production**: Uses configured `VITE_REDIRECT_URL` or falls back to origin

## Testing Workflow

### Method 1: Manual Testing

1. **Configure Supabase** (Solution 1 above)

2. **Use the normal sign-in flow** - magic links will now redirect to localhost

3. **Test different scenarios:**
   - New user signup
   - Existing user signin
   - Trial restrictions
   - Subscription flows

### Method 2: Bypass Trial for Testing

If you need to test without trial restrictions:

1. **Open browser console** (F12)
2. **Run** `localStorage.setItem('dev_override_trial', 'true')`
3. **Refresh the page**

## Environment Variables

Create a `.env.local` file in `apps/web/` with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration  
VITE_API_URL=http://localhost:3001

# Optional: Override redirect URL
VITE_REDIRECT_URL=http://localhost:5173
```

## Troubleshooting

### Magic Links Still Redirect to Production

1. **Check Supabase configuration** - ensure localhost URLs are added
2. **Clear browser cache** and try again
3. **Check console for errors** in the Dev Panel

### Trial Bypass Not Working

1. **Check browser console** for any errors
2. **Verify localStorage** has the dev flag set
3. **Refresh the page** after setting the flag

### Authentication Not Working

1. **Verify Supabase credentials** in your `.env.local`
2. **Check network requests** in browser dev tools
3. **Ensure API server is running** (`npm run dev:api`)

## Development Features Added

### 1. Smart Redirect URLs
- Automatically uses localhost in development
- Falls back to production URLs in production

### 2. Authentication Guards
- Logged-in users are automatically redirected away from signin/signup pages
- Redirects to dashboard (`/dashboard`) by default
- Prevents authenticated users from accessing auth pages

### 3. Manual Development Tools
- Browser console commands for testing
- localStorage flags for bypassing restrictions

### 4. Trial Bypass
- `localStorage.setItem('dev_override_trial', 'true')`
- Automatically cleared in production

### 5. Enhanced Error Handling
- Better error messages for development
- Console logging for debugging

## Best Practices

1. **Always test in development first** before deploying
2. **Configure Supabase properly** for seamless local development
3. **Use browser console** for quick testing scenarios
4. **Clear dev flags** before testing production-like scenarios
5. **Test both authenticated and unauthenticated states**

## Security Notes

- Development features are automatically disabled in production
- Trial bypass only works locally
- All development flags are cleared on production builds
