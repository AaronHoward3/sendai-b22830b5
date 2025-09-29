# Additional Product Extraction Strategies

## Overview

Beyond the current universal scraper, here are additional strategies and approaches we could implement to extract products from any e-commerce site.

## 1. API-Based Extraction

### E-commerce Platform APIs
Many platforms offer official APIs that provide structured product data:

- **Shopify API**: `/admin/api/2023-10/products.json`
- **WooCommerce REST API**: `/wp-json/wc/v3/products`
- **BigCommerce API**: `/stores/{store_hash}/v3/catalog/products`
- **Magento REST API**: `/rest/V1/products`
- **Squarespace Commerce API**: `/v1/commerce/products`

### Implementation Strategy
```javascript
async function extractFromAPI(domain, platform) {
  const apiConfig = {
    shopify: {
      endpoint: `https://${domain}/admin/api/2023-10/products.json`,
      headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN }
    },
    woocommerce: {
      endpoint: `https://${domain}/wp-json/wc/v3/products`,
      auth: { username: process.env.WC_KEY, password: process.env.WC_SECRET }
    }
  };
  
  // Extract products from API
}
```

## 2. Sitemap-Based Extraction

### XML Sitemaps
Most e-commerce sites have sitemaps with product URLs:

```javascript
async function extractFromSitemap(domain) {
  const sitemapUrl = `https://${domain}/sitemap.xml`;
  const sitemap = await fetch(sitemapUrl);
  const xml = await sitemap.text();
  
  // Parse XML and extract product URLs
  const productUrls = extractProductUrlsFromSitemap(xml);
  
  // Fetch individual product pages
  const products = [];
  for (const url of productUrls.slice(0, 6)) {
    const product = await extractProductFromPage(url);
    products.push(product);
  }
  
  return products;
}
```

### Robots.txt Discovery
```javascript
async function discoverSitemaps(domain) {
  const robotsUrl = `https://${domain}/robots.txt`;
  const robots = await fetch(robotsUrl);
  const text = await robots.text();
  
  // Extract sitemap URLs from robots.txt
  const sitemapMatches = text.match(/Sitemap:\s*(.+)/gi);
  return sitemapMatches.map(match => match.split(':')[1].trim());
}
```

## 3. Search Engine Integration

### Google Shopping API
```javascript
async function extractFromGoogleShopping(query, domain) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://www.googleapis.com/shopping/search/v1/public/products`;
  
  const response = await fetch(`${url}?key=${apiKey}&q=${query}&country=US`);
  const data = await response.json();
  
  return data.items.map(item => ({
    name: item.product.title,
    url: item.product.link,
    image_url: item.product.images[0]?.link,
    price: item.offer.price?.value,
    source: 'google-shopping'
  }));
}
```

### Bing Shopping API
```javascript
async function extractFromBingShopping(query) {
  const apiKey = process.env.BING_API_KEY;
  const url = `https://api.bing.microsoft.com/v7.0/shopping/search`;
  
  const response = await fetch(`${url}?q=${query}`, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey }
  });
  
  const data = await response.json();
  return data.webPages.value.map(item => ({
    name: item.name,
    url: item.url,
    image_url: item.image?.thumbnailUrl,
    source: 'bing-shopping'
  }));
}
```

## 4. Social Media Integration

### Instagram Shopping
```javascript
async function extractFromInstagramShopping(brandHandle) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const url = `https://graph.instagram.com/v12.0/${brandHandle}/media`;
  
  const response = await fetch(`${url}?access_token=${accessToken}&fields=id,caption,media_type,media_url,permalink`);
  const data = await response.json();
  
  return data.data
    .filter(post => post.media_type === 'CAROUSEL_ALBUM' || post.media_type === 'IMAGE')
    .map(post => ({
      name: extractProductNameFromCaption(post.caption),
      url: post.permalink,
      image_url: post.media_url,
      source: 'instagram'
    }));
}
```

### Pinterest Product Pins
```javascript
async function extractFromPinterest(boardUrl) {
  // Pinterest doesn't have a public API for product pins
  // Would need to scrape the board page
  const response = await fetch(boardUrl);
  const html = await response.text();
  
  // Extract product pins from HTML
  const $ = cheerio.load(html);
  const pins = [];
  
  $('[data-test-id="pin"]').each((i, el) => {
    const $pin = $(el);
    const title = $pin.find('[data-test-id="pinTitle"]').text();
    const link = $pin.find('a').attr('href');
    const image = $pin.find('img').attr('src');
    
    if (title && link && image) {
      pins.push({ name: title, url: link, image_url: image, source: 'pinterest' });
    }
  });
  
  return pins;
}
```

## 5. Browser Automation

### Puppeteer/Playwright
For sites with heavy JavaScript:

```javascript
import puppeteer from 'puppeteer';

async function extractWithPuppeteer(domain) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(`https://${domain}`, { waitUntil: 'networkidle0' });
  
  // Wait for products to load
  await page.waitForSelector('.product, .item, .card', { timeout: 10000 });
  
  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll('.product, .item, .card');
    return Array.from(productElements).map(el => ({
      name: el.querySelector('h1, h2, h3, .title, .name')?.textContent,
      url: el.querySelector('a')?.href,
      image_url: el.querySelector('img')?.src,
      price: el.querySelector('.price, .cost')?.textContent
    }));
  });
  
  await browser.close();
  return products.filter(p => p.name && p.url);
}
```

## 6. Machine Learning Approaches

### Computer Vision for Product Detection
```javascript
import * as tf from '@tensorflow/tfjs-node';

async function detectProductsWithML(domain) {
  const page = await fetch(`https://${domain}`);
  const html = await page.text();
  const $ = cheerio.load(html);
  
  // Extract all images
  const images = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('logo') && !src.includes('icon')) {
      images.push({
        src,
        alt: $(el).attr('alt'),
        context: $(el).closest('div').text().substring(0, 200)
      });
    }
  });
  
  // Use ML model to classify images as products
  const model = await tf.loadLayersModel('product-detection-model.json');
  
  const productImages = [];
  for (const img of images) {
    const tensor = await preprocessImage(img.src);
    const prediction = await model.predict(tensor);
    
    if (prediction.dataSync()[0] > 0.8) { // 80% confidence
      productImages.push(img);
    }
  }
  
  return productImages;
}
```

### NLP for Product Name Extraction
```javascript
import natural from 'natural';

function extractProductNamesWithNLP(text) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text);
  
  // Use NLP to identify product names
  const productKeywords = ['shirt', 'shoes', 'bag', 'phone', 'laptop', 'book'];
  const productNames = [];
  
  for (let i = 0; i < tokens.length - 2; i++) {
    const phrase = tokens.slice(i, i + 3).join(' ');
    if (productKeywords.some(keyword => phrase.toLowerCase().includes(keyword))) {
      productNames.push(phrase);
    }
  }
  
  return productNames;
}
```

## 7. Database-Driven Approach

### Product Database APIs
```javascript
async function extractFromProductDatabases(brandName) {
  const apis = [
    {
      name: 'OpenFoodFacts',
      url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${brandName}&json=1`
    },
    {
      name: 'OpenBeautyFacts', 
      url: `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${brandName}&json=1`
    },
    {
      name: 'OpenProductFacts',
      url: `https://world.openproductfacts.org/cgi/search.pl?search_terms=${brandName}&json=1`
    }
  ];
  
  const products = [];
  for (const api of apis) {
    try {
      const response = await fetch(api.url);
      const data = await response.json();
      
      products.push(...data.products.map(product => ({
        name: product.product_name,
        url: product.url,
        image_url: product.image_url,
        source: api.name
      })));
    } catch (error) {
      console.log(`Failed to fetch from ${api.name}`);
    }
  }
  
  return products;
}
```

## 8. Hybrid Approach

### Multi-Source Aggregation
```javascript
async function extractProductsHybrid(domain) {
  const strategies = [
    () => extractFromSitemap(domain),
    () => extractFromAPI(domain),
    () => extractWithPuppeteer(domain),
    () => extractFromGoogleShopping(domain),
    () => extractFromInstagramShopping(domain)
  ];
  
  const results = await Promise.allSettled(strategies.map(strategy => strategy()));
  
  // Aggregate and deduplicate results
  const allProducts = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      allProducts.push(...result.value);
    }
  });
  
  return deduplicateProducts(allProducts);
}

function deduplicateProducts(products) {
  const seen = new Set();
  return products.filter(product => {
    const key = `${product.name}-${product.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

## 9. Real-time Monitoring

### Webhook Integration
```javascript
// Set up webhooks for product updates
app.post('/webhooks/shopify/products/create', async (req, res) => {
  const product = req.body;
  
  // Store new product in database
  await db.products.create({
    name: product.title,
    url: `https://${req.headers['x-shopify-shop-domain']}/products/${product.handle}`,
    image_url: product.image?.src,
    price: product.variants[0]?.price,
    source: 'shopify-webhook'
  });
  
  res.status(200).send('OK');
});
```

### RSS Feed Monitoring
```javascript
async function monitorRSSFeeds(domain) {
  const feeds = [
    `${domain}/feed`,
    `${domain}/rss`,
    `${domain}/products/feed`
  ];
  
  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl);
      const xml = await response.text();
      
      // Parse RSS/Atom feed for product updates
      const products = parseRSSForProducts(xml);
      return products;
    } catch (error) {
      console.log(`Failed to fetch RSS from ${feedUrl}`);
    }
  }
}
```

## Implementation Priority

1. **Sitemap Extraction** - High success rate, easy to implement
2. **API Integration** - Most reliable, requires API keys
3. **Browser Automation** - Handles complex sites, slower
4. **Search Engine APIs** - Good for discovery, rate limited
5. **Social Media** - Good for trending products, API limitations
6. **Machine Learning** - Future enhancement, requires training data
7. **Database APIs** - Good for specific product categories
8. **Real-time Monitoring** - Best for ongoing updates

## Cost Considerations

- **ScrapingBee**: $0.50-2.00 per 1000 requests
- **Google Shopping API**: $5 per 1000 requests
- **Instagram API**: Free with limitations
- **Puppeteer**: Free but requires server resources
- **ML Models**: $0.10-1.00 per 1000 predictions

## Next Steps

1. Implement sitemap extraction as next priority
2. Add API integration for major platforms
3. Set up browser automation for complex sites
4. Integrate search engine APIs for discovery
5. Develop ML models for product detection
6. Create hybrid aggregation system
