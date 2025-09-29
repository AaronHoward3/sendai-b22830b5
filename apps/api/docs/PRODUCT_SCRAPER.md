# Enhanced Product Scraper

The enhanced product scraper is designed to work with any e-commerce website, not just Shopify stores. It uses multiple detection strategies to reliably extract product information.

## Features

### 🎯 Multi-Platform Support
- **Shopify** - Native support for Shopify stores
- **WooCommerce** - WordPress e-commerce sites
- **Magento** - Enterprise e-commerce platform
- **BigCommerce** - Cloud e-commerce platform  
- **Squarespace Commerce** - Squarespace online stores
- **Generic** - Any other e-commerce site

### 🔍 Detection Strategies (in order of preference)

1. **Structured Data** (Most reliable)
   - JSON-LD structured data parsing
   - Microdata extraction
   - Schema.org Product markup

2. **Platform-Specific Selectors**
   - Optimized selectors for each platform
   - Platform-specific URL patterns
   - Custom image and description extraction

3. **Generic Pattern Matching**
   - Common e-commerce patterns
   - Generic product URL detection
   - Fallback selectors

4. **Links with Images** (Last resort)
   - Any link containing images
   - Basic name/image extraction

### 🖼️ Enhanced Image Extraction
- **Srcset handling** - Selects highest quality images
- **Lazy loading support** - Handles data-src attributes
- **Size normalization** - Removes size suffixes (e.g., `_300x300`)
- **Multiple image sources** - Checks various image attributes

## API Usage

### Basic Scraping
```bash
POST /api/product/scrape
Content-Type: application/json

{
  "domain": "example.com"
}
```

### Legacy Fallback
```bash
POST /api/product/scrape
Content-Type: application/json

{
  "domain": "example.com",
  "useLegacy": true
}
```

### Testing & Comparison
```bash
POST /api/product/test
Content-Type: application/json

{
  "domain": "example.com",
  "debug": true
}
```

## Response Format

```json
{
  "products": [
    {
      "name": "Product Name",
      "url": "https://example.com/products/item",
      "image_url": "https://example.com/images/product.jpg",
      "description": "Product description",
      "price": "$29.99",
      "source": "json-ld"
    }
  ],
  "count": 3,
  "domain": "example.com",
  "scraper": "enhanced"
}
```

### Source Types
- `json-ld` - Extracted from JSON-LD structured data
- `microdata` - Extracted from microdata markup
- `platform-shopify` - Shopify-specific extraction
- `platform-woocommerce` - WooCommerce-specific extraction
- `platform-magento` - Magento-specific extraction
- `platform-bigcommerce` - BigCommerce-specific extraction
- `platform-squarespace` - Squarespace-specific extraction
- `generic` - Generic pattern matching
- `fallback` - Last resort link extraction

## Testing

### Run Test Suite
```bash
cd apps/api
node scripts/test-scraper.js
```

### Test Specific Domain
```javascript
import { testScraper } from './scripts/test-scraper.js';

const result = await testScraper('shopify-store.com');
console.log(result);
```

## Configuration

### Environment Variables
- `SCRAPINGBEE_API_KEY` - Required for web scraping service
- `EG_DEBUG` - Set to "1" for detailed logging

### Scraping Parameters
- `render_js: false` - Faster scraping, no JavaScript execution
- `premium_proxy: true` - Better success rate
- `country_code: 'us'` - US-based proxy

## Platform Detection

The scraper automatically detects e-commerce platforms using:

1. **Meta tags** - `<meta name="generator">` and `<meta name="powered-by">`
2. **Body attributes** - CSS classes and data attributes
3. **Script sources** - Platform-specific JavaScript files
4. **URL patterns** - Platform-specific URL structures

## Error Handling

The scraper includes comprehensive error handling:

1. **Automatic fallback** - Falls back to legacy scraper if enhanced fails
2. **Graceful degradation** - Returns partial results if some extraction fails
3. **Detailed logging** - Comprehensive error messages and debugging info
4. **Timeout protection** - Prevents hanging requests

## Best Practices

### For Developers
1. Always handle the case where no products are found
2. Check the `source` field to understand extraction method
3. Use the test endpoint to compare scraper performance
4. Monitor logs for platform detection accuracy

### For Production
1. Implement rate limiting to respect target websites
2. Cache results to reduce scraping frequency  
3. Monitor ScrapingBee API usage and costs
4. Set up alerts for scraping failures

## Troubleshooting

### No Products Found
1. Check if the website requires JavaScript (try `render_js: true`)
2. Verify the domain is accessible and contains products
3. Check ScrapingBee API key and quota
4. Review logs for specific error messages

### Poor Quality Results
1. The site might use non-standard markup
2. Consider adding custom selectors for specific platforms
3. Check if structured data is available but not being parsed
4. Verify image URLs are not broken or require authentication

### Performance Issues
1. Reduce the number of concurrent requests
2. Use caching to avoid repeated scraping
3. Consider using `render_js: false` for faster scraping
4. Implement request queuing for high-volume usage

## Contributing

To add support for a new platform:

1. Add platform detection patterns to `PLATFORM_PATTERNS`
2. Define platform-specific selectors
3. Add test cases in `test-scraper.js`
4. Update documentation

## Limitations

- Requires ScrapingBee API key (paid service)
- Some sites may block scraping attempts
- JavaScript-heavy sites may need `render_js: true`
- Rate limiting may be required for high-volume usage
- Some platforms may have anti-scraping measures
