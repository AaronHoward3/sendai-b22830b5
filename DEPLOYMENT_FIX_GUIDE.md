# 🚀 Deployment Fix Guide

## Issues Found & Solutions

### 1. CORS Errors ✅ FIXED
- **Problem**: API was rejecting requests from your frontend
- **Root Cause**: Domain changed from `https://iriosa-i.vercel.app` to `https://www.irios.ai/`
- **Solution**: Updated CORS configuration to allow the new domain
- **Status**: Fixed in code, needs redeploy

### 2. 500 Errors on Product Scraping ❌ NEEDS ENV VARS
- **Problem**: Missing `SCRAPINGBEE_API_KEY` environment variable
- **Solution**: Add ScrapingBee API key to Render environment variables

### 3. 500 Errors on Context Generation ❌ NEEDS ENV VARS  
- **Problem**: Missing `OPENAI_API_KEY` environment variable
- **Solution**: Add OpenAI API key to Render environment variables

## 🔧 Required Environment Variables

You need to add these environment variables to your Render deployment:

### In Render Dashboard:
1. Go to your `irios-api` service
2. Go to "Environment" tab
3. Add these variables:

```
SCRAPINGBEE_API_KEY=your_scrapingbee_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Already configured (updated for new domain):
```
CLIENT_URL=https://www.irios.ai
ALLOW_ALL_ORIGINS=true
```

## 🔑 How to Get API Keys

### ScrapingBee API Key:
1. Go to https://www.scrapingbee.com/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 1,000 requests/month

### OpenAI API Key:
1. Go to https://platform.openai.com/
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

## 🚀 Deploy Steps

1. **Add Environment Variables** in Render dashboard
2. **Redeploy** your API service (Render should auto-deploy from your updated `render.yaml`)
3. **Update Vercel** if your API domain changed
4. **Test** the endpoints

## 🧪 Test After Deployment

Test these endpoints to verify everything works:

```bash
# Test CORS (should work now with new domain)
curl -H "Origin: https://www.irios.ai" \
     -H "Content-Type: application/json" \
     https://your-api-domain.onrender.com/api/brand/check

# Test product scraping (needs SCRAPINGBEE_API_KEY)
curl -X POST https://your-api-domain.onrender.com/api/products/scrape \
     -H "Content-Type: application/json" \
     -d '{"domain": "example.com"}'

# Test context generation (needs OPENAI_API_KEY)
curl -X POST https://your-api-domain.onrender.com/api/context/generate \
     -H "Content-Type: application/json" \
     -d '{"domain": "example.com"}'
```

## 📋 Checklist

- [ ] Add `SCRAPINGBEE_API_KEY` to Render environment variables
- [ ] Add `OPENAI_API_KEY` to Render environment variables  
- [ ] Redeploy API service
- [ ] Update Vercel domain if API domain changed
- [ ] Test product scraping endpoint
- [ ] Test context generation endpoint
- [ ] Test frontend integration at https://www.irios.ai/

## 🆘 If Still Having Issues

Check Render logs for detailed error messages:
1. Go to your `irios-api` service in Render
2. Click "Logs" tab
3. Look for error messages related to:
   - Missing API keys
   - CORS rejections
   - Authentication failures
