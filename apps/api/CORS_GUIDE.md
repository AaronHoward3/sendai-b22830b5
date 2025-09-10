# CORS Configuration Guide

## Quick Fix for CORS Errors

If you're getting CORS errors, you have several options:

### Option 1: Enable Development Mode (Recommended for local development)
Set this environment variable to allow all origins:
```bash
ALLOW_ALL_ORIGINS=true
```

### Option 2: Set the Correct CLIENT_URL
Set your frontend URL in the environment:
```bash
CLIENT_URL=http://localhost:5173
# or whatever port your frontend is running on
```

### Option 3: Add Your Production URL
If deploying to production, set:
```bash
PRODUCTION_URL=https://yourdomain.com
```

## Environment Variables for CORS

The API server now supports these environment variables:

- `CLIENT_URL` - Primary frontend URL (defaults to http://localhost:5173)
- `NODE_ENV=development` - Enables development mode (allows all origins)
- `ALLOW_ALL_ORIGINS=true` - Force allow all origins (useful for debugging)
- `PRODUCTION_URL` - Your production frontend URL
- `VERCEL_URL` - Auto-detected if deploying on Vercel
- `RENDER_EXTERNAL_URL` - Auto-detected if deploying on Render

## Default Allowed Origins

The server now automatically allows these common development origins:
- http://localhost:5173 (Vite default)
- http://localhost:3000 (React default)
- http://localhost:8080 (Common dev port)
- https://localhost:5173 (HTTPS dev)
- https://localhost:3000 (HTTPS dev)

## Debugging CORS Issues

The server now logs rejected origins and allowed origins when CORS errors occur. Check your server logs to see:
- Which origin was rejected
- What origins are currently allowed
- Whether you're in development mode
