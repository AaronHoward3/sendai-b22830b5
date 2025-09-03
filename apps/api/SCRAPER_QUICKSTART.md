# Enhanced Product Scraper - Quick Start

## 🚀 What's New

Your product scraper has been upgraded to work with **any website**, not just Shopify stores! 

### Key Improvements:
- ✅ **Universal compatibility** - Works with Shopify, WooCommerce, Magento, BigCommerce, and any e-commerce site
- ✅ **Structured data parsing** - Extracts rich product information from JSON-LD and microdata
- ✅ **Smart image extraction** - Handles srcset, lazy loading, and finds highest quality images
- ✅ **Automatic fallback** - Falls back to legacy scraper if needed
- ✅ **Better error handling** - Comprehensive logging and graceful degradation

## 🧪 Testing the Enhanced Scraper

### 1. Quick Demo
```bash
cd apps/api
node scripts/demo-scraper.js
```

### 2. Compare Scrapers
```bash
# Test both enhanced and legacy scrapers
curl -X POST http://localhost:3000/api/product/test \
  -H "Content-Type: application/json" \
  -d '{"domain": "gymshark.com", "debug": true}'
```

### 3. Use Enhanced Scraper (Default)
```bash
curl -X POST http://localhost:3000/api/product/scrape \
  -H "Content-Type: application/json" \
  -d '{"domain": "any-ecommerce-site.com"}'
```

### 4. Fallback to Legacy
```bash
curl -X POST http://localhost:3000/api/product/scrape \
  -H "Content-Type: application/json" \
  -d '{"domain": "shopify-store.com", "useLegacy": true}'
```

## 📊 Expected Results

The enhanced scraper should find **more products** with **better quality data**:

### Before (Legacy)
```json
{
  "products": [
    {
      "name": "Product Name",
      "url": "https://site.com/products/item",
      "image_url": "https://site.com/image.jpg",
      "description": ""
    }
  ],
  "count": 1
}
```

### After (Enhanced)
```json
{
  "products": [
    {
      "name": "Premium Product Name",
      "url": "https://site.com/products/premium-item",
      "image_url": "https://site.com/high-res-image.jpg",
      "description": "Detailed product description",
      "price": "$99.99",
      "source": "json-ld"
    }
  ],
  "count": 6,
  "scraper": "enhanced"
}
```

## 🔧 Configuration

### Required Environment Variables
```bash
# In your .env file
SCRAPINGBEE_API_KEY=your_api_key_here
```

### Optional Debug Mode
```bash
# Enable detailed logging
EG_DEBUG=1
```

## 🎯 Supported Platforms

| Platform | Detection | Specific Selectors | Structured Data |
|----------|-----------|-------------------|-----------------|
| Shopify | ✅ | ✅ | ✅ |
| WooCommerce | ✅ | ✅ | ✅ |
| Magento | ✅ | ✅ | ✅ |
| BigCommerce | ✅ | ✅ | ✅ |
| Squarespace | ✅ | ✅ | ✅ |
| Generic Sites | ✅ | ✅ | ✅ |

## 🚨 Migration Notes

### Automatic Migration
- The enhanced scraper is **automatically used by default**
- Your existing API calls will work unchanged
- Legacy scraper is used as automatic fallback

### Breaking Changes
- None! The API is backward compatible

### New Features Available
- `source` field indicates extraction method
- `price` field when available
- Better `description` extraction
- Higher quality images

## 🐛 Troubleshooting

### No Products Found
1. Check if ScrapingBee API key is set
2. Try the test endpoint to compare scrapers
3. Check server logs for detailed error messages

### Poor Results
1. Some sites may need JavaScript rendering (`render_js: true`)
2. Check if the site blocks scraping
3. Verify the domain is accessible

### API Errors
1. Ensure ScrapingBee account has sufficient credits
2. Check rate limits
3. Verify domain format (no http:// prefix needed)

## 📈 Performance

The enhanced scraper is designed to be:
- **Faster** - Multiple extraction strategies in parallel
- **More reliable** - Automatic fallbacks and error handling  
- **Better quality** - Structured data and smart image selection

## 🔮 Next Steps

1. Test with your most common domains
2. Monitor the `source` field to see which extraction methods work best
3. Consider implementing caching for frequently scraped domains
4. Set up monitoring for scraping success rates

## 📚 Full Documentation

See `apps/api/docs/PRODUCT_SCRAPER.md` for complete technical documentation.
