import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Hybrid Product Scraper - Combines multiple strategies with advanced filtering
 * 
 * Features:
 * 1. Multi-strategy extraction (structured data, platform-specific, generic, sitemap)
 * 2. Advanced product validation and filtering
 * 3. Intelligent content analysis
 * 4. Quality scoring and ranking
 * 5. Deduplication and consolidation
 * 6. Fallback mechanisms for difficult sites
 */

// Enhanced platform detection with more patterns
const PLATFORM_PATTERNS = {
  shopify: {
    meta: ['shopify'],
    selectors: [
      'a[href*="/products/"]',
      '.product-item a',
      '.product-card a',
      '.grid__item .card__content a',
      '[data-product-url] a',
      '.product-grid a'
    ],
    productUrl: /\/products\//,
    imageSelectors: ['.product-item img', '.product-card img', '.card__media img'],
    nameSelectors: ['.product-item__title', '.card__heading', 'h3', 'h2'],
    priceSelectors: ['.price', '.product-item__price', '.card__price'],
    descriptionSelectors: ['.product-item__excerpt', '.card__text']
  },
  woocommerce: {
    meta: ['woocommerce'],
    selectors: [
      '.product a',
      '.woocommerce-LoopProduct-link',
      'li.product a',
      '.product-item a'
    ],
    productUrl: /\/product\//,
    imageSelectors: ['.attachment-woocommerce_thumbnail', '.wp-post-image'],
    nameSelectors: ['.woocommerce-loop-product__title', 'h2', 'h3'],
    priceSelectors: ['.price', '.woocommerce-Price-amount'],
    descriptionSelectors: ['.woocommerce-product-details__short-description']
  },
  magento: {
    meta: ['magento'],
    selectors: [
      '.product-item a',
      '.product-item-link',
      '.product-item-photo'
    ],
    productUrl: /\.html$/,
    imageSelectors: ['.product-image-photo', '.product-item-photo img'],
    nameSelectors: ['.product-item-name', '.product-name'],
    priceSelectors: ['.price', '.price-box'],
    descriptionSelectors: ['.product-item-description']
  },
  bigcommerce: {
    meta: ['bigcommerce'],
    selectors: [
      '.product a',
      '.productGrid-item a'
    ],
    productUrl: /\/products\//,
    imageSelectors: ['.productGrid-image img', '.card-image img'],
    nameSelectors: ['.card-title', '.productGrid-title'],
    priceSelectors: ['.price', '.card-price'],
    descriptionSelectors: ['.card-text']
  },
  squarespace: {
    meta: ['squarespace'],
    selectors: [
      '.ProductList-item a',
      '.grid-item a'
    ],
    productUrl: /\/p\//,
    imageSelectors: ['.ProductList-image img', '.grid-image img'],
    nameSelectors: ['.ProductList-title', '.grid-title'],
    priceSelectors: ['.product-price', '.ProductList-price'],
    descriptionSelectors: ['.ProductList-description']
  },
  nike: {
    meta: ['nike'],
    selectors: [
      'a[href*="/t/"]',
      '.product-card a',
      '.grid-item a',
      '[data-testid*="product"] a',
      '.product-grid a',
      '.product-list a',
      '[class*="product"] a'
    ],
    productUrl: /\/t\//,
    imageSelectors: [
      '.product-card img', 
      '.grid-item img', 
      '[data-testid*="product"] img',
      '.product-grid img',
      '.product-list img',
      '[class*="product"] img',
      'img[alt*="Nike"]'
    ],
    nameSelectors: [
      '.product-card__title', 
      '.grid-item__title', 
      'h3', 
      'h2',
      '.product-title',
      '.product-name',
      '[class*="title"]'
    ],
    priceSelectors: ['.product-price', '.price'],
    descriptionSelectors: ['.product-card__subtitle', '.grid-item__subtitle']
  },
  etsy: {
    meta: ['etsy'],
    selectors: [
      'a[href*="/listing/"]',
      '.listing-link',
      '.card a'
    ],
    productUrl: /\/listing\//,
    imageSelectors: ['.listing-image img', '.card-image img'],
    nameSelectors: ['.listing-title', '.card-title'],
    priceSelectors: ['.currency-value', '.price'],
    descriptionSelectors: ['.listing-description']
  },
  amazon: {
    meta: ['amazon'],
    selectors: [
      'a[href*="/dp/"]',
      'a[href*="/product/"]',
      '.s-result-item a'
    ],
    productUrl: /\/dp\//,
    imageSelectors: ['.s-image', '.product-image img'],
    nameSelectors: ['.s-title', '.product-title'],
    priceSelectors: ['.a-price', '.price'],
    descriptionSelectors: ['.s-description']
  },
  target: {
    meta: ['target'],
    selectors: [
      'a[href*="/p/"]',
      '.product-card a',
      '.grid-item a'
    ],
    productUrl: /\/p\//,
    imageSelectors: ['.product-image img', '.card-image img'],
    nameSelectors: ['.product-title', '.card-title'],
    priceSelectors: ['.price', '.product-price'],
    descriptionSelectors: ['.product-description']
  }
};

// Enhanced generic patterns
const UNIVERSAL_PATTERNS = {
  productSelectors: [
    // Common product link patterns
    'a[href*="product"]',
    'a[href*="item"]',
    'a[href*="shop"]',
    'a[href*="store"]',
    'a[href*="catalog"]',
    'a[href*="buy"]',
    'a[href*="detail"]',
    'a[href*="goods"]',
    'a[href*="merchandise"]',
    'a[href*="/p/"]',
    'a[href*="/t/"]',
    'a[href*="/dp/"]',
    'a[href*="/listing/"]',
    
    // Common product container patterns
    '.product a',
    '.item a',
    '.card a',
    'article a',
    '.grid-item a',
    '.product-item a',
    '.product-card a',
    '[data-product] a',
    '[data-item] a',
    '[data-card] a',
    
    // React/Vue/Angular patterns
    '[class*="product"] a',
    '[class*="item"] a',
    '[class*="card"] a',
    '[data-testid*="product"] a',
    '[data-testid*="item"] a',
    '[data-testid*="card"] a'
  ],
  productUrlPatterns: [
    /\/product[s]?\//,
    /\/item[s]?\//,
    /\/shop\//,
    /\/store\//,
    /\/catalog\//,
    /\/p\//,
    /\/t\//,
    /\/dp\//,
    /\/listing\//,
    /\/buy\//,
    /\/detail[s]?\//,
    /\/goods\//,
    /\/merchandise\//,
    /\.html$/,
    /\/[a-z0-9-]{8,}\//  // Long product IDs
  ],
  imageSelectors: [
    'img[alt*="product"]',
    'img[class*="product"]',
    'img[class*="item"]',
    'img[class*="card"]',
    '.product img',
    '.item img',
    '.card img',
    'article img',
    '.product-image img',
    '.item-image img',
    '.card-image img',
    '[data-testid*="image"] img',
    '[data-testid*="photo"] img'
  ],
  nameSelectors: [
    'h1', 'h2', 'h3', 'h4',
    '.title', '.name', '.product-name', '.item-name', '.card-title',
    '[class*="title"]', '[class*="name"]',
    '[data-testid*="title"]', '[data-testid*="name"]'
  ],
  priceSelectors: [
    '.price', '.cost', '.amount', '.value',
    '[class*="price"]', '[class*="cost"]', '[class*="amount"]',
    '[data-price]', '[itemprop="price"]',
    '[data-testid*="price"]', '[data-testid*="cost"]'
  ]
};

// Advanced filtering patterns
const FILTER_PATTERNS = {
  // URLs that should be ignored
  ignoredUrls: [
    '/cart', '/checkout', '/account', '/login', '/register', '/signup',
    '/search', '/contact', '/about', '/blog', '/news', '/faq',
    '/privacy', '/terms', '/shipping', '/returns', '/policy',
    '/do-not-share', '/settings', '/preferences', '/cookies',
    '/help', '/support', '/customer-service', '/size-guide',
    '/store-locator', '/careers', '/investors', '/press',
    '/orders', '/order-status', '/track-order', '/order-details',
    '/wishlist', '/favorites', '/compare', '/reviews',
    'mailto:', 'tel:', '#', 'javascript:', 'facebook.com', 'instagram.com',
    'twitter.com', 'youtube.com', 'tiktok.com',
    '.pdf', '.doc', '.zip', '.mp4', '.mp3'
  ],
  
  // Names that should be ignored
  ignoredNames: [
    // Navigation/UI elements
    'menu', 'search', 'cart', 'account', 'login', 'register',
    'home', 'back', 'next', 'previous', 'close', 'open',
    'privacy', 'terms', 'policy', 'cookies', 'settings',
    'your privacy choices', 'do not share', 'preferences',
    'learn more', 'read more', 'view all', 'see all',
    'sign up', 'subscribe', 'newsletter', 'follow us',
    'order status', 'track order', 'order details',
    'wishlist', 'favorites', 'compare', 'reviews',
    
    // Empty or generic
    'image', 'photo', 'picture', 'logo', 'icon',
    'loading', 'placeholder', 'default', 'more', 'all',
    'new', 'sale', 'hot', 'best', 'popular', 'trending'
  ],
  
  // Product indicators that boost confidence
  productIndicators: [
    'buy', 'add to cart', 'purchase', 'shop now',
    'price', 'cost', 'sale', 'discount', 'offer',
    'shipping', 'delivery', 'in stock', 'out of stock',
    'reviews', 'ratings', 'stars', 'customer reviews'
  ],
  
  // Non-product indicators that reduce confidence
  nonProductIndicators: [
    'about us', 'contact us', 'help', 'support',
    'privacy policy', 'terms of service', 'shipping info',
    'return policy', 'size guide', 'care instructions',
    'blog', 'news', 'press', 'careers', 'investors'
  ]
};

export async function scrapeProductsFromDomain(domain, options = {}) {
  const {
    maxProducts = 6,
    enableJavaScript = true,
    timeout = 30000,
    retries = 2,
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    minConfidence = 0.6
  } = options;

  try {
    console.log(`🔍 Hybrid scraping from: ${domain}`);
    
    const scrapingbeeApiKey = process.env.SCRAPINGBEE_API_KEY;
    const url = `https://${domain}`;

    // Try multiple strategies with different configurations
    const strategies = [
      { render_js: true, premium_proxy: true, country_code: 'us' },
      { render_js: false, premium_proxy: true, country_code: 'us' },
      { render_js: true, premium_proxy: false, country_code: 'us' }
    ];

    let html = null;
    let lastError = null;

    // Try different strategies until one works
    for (let attempt = 0; attempt < strategies.length; attempt++) {
      try {
        const strategy = strategies[attempt];
        console.log(`📡 Attempt ${attempt + 1}: ${JSON.stringify(strategy)}`);
        
        const response = await axios.get(
          `https://app.scrapingbee.com/api/v1/`,
          {
            params: {
              api_key: scrapingbeeApiKey,
              url: url,
              timeout: timeout,
              ...strategy
            },
            headers: {
              "User-Agent": userAgent
            }
          }
        );

        html = response.data;
        break;
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt < strategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!html) {
      throw lastError || new Error('All scraping strategies failed');
    }

    const $ = cheerio.load(html);
    
    // Step 1: Detect platform
    const platform = detectPlatform($, domain);
    console.log(`🎯 Detected platform: ${platform || 'Generic'}`);

    // Step 2: Try multiple extraction strategies
    const allProducts = [];
    
    // Strategy 1: Structured data (highest priority)
    const structuredProducts = extractStructuredData($, domain);
    allProducts.push(...structuredProducts.map(p => ({ ...p, strategy: 'structured', confidence: 0.95 })));
    
    // Strategy 2: Platform-specific extraction
    if (platform && PLATFORM_PATTERNS[platform]) {
      const platformProducts = extractProductsPlatformSpecific($, domain, platform);
      allProducts.push(...platformProducts.map(p => ({ ...p, strategy: 'platform', confidence: 0.85 })));
    }
    
    // Strategy 3: Sitemap extraction
    const sitemapProducts = await extractFromSitemap(domain);
    allProducts.push(...sitemapProducts.map(p => ({ ...p, strategy: 'sitemap', confidence: 0.80 })));
    
    // Strategy 4: Advanced generic pattern matching
    const genericProducts = extractProductsAdvancedGeneric($, domain);
    allProducts.push(...genericProducts.map(p => ({ ...p, strategy: 'generic', confidence: 0.70 })));
    
    // Strategy 5: AI-powered content analysis
    const aiProducts = extractProductsWithAI($, domain);
    allProducts.push(...aiProducts.map(p => ({ ...p, strategy: 'ai', confidence: 0.65 })));
    
    // Strategy 6: Intelligent fallback
    const fallbackProducts = extractProductsIntelligent($, domain);
    allProducts.push(...fallbackProducts.map(p => ({ ...p, strategy: 'fallback', confidence: 0.50 })));

    // Step 3: Advanced filtering and validation
    const filteredProducts = filterAndValidateProducts(allProducts, domain);
    
    // Step 4: Quality scoring and ranking
    const scoredProducts = scoreAndRankProducts(filteredProducts);
    
    // Step 5: Deduplication
    const deduplicatedProducts = deduplicateProducts(scoredProducts);
    
    // Step 6: Return top results
    const finalProducts = deduplicatedProducts
      .filter(p => p.confidence >= minConfidence)
      .slice(0, maxProducts);

    console.log(`✅ Found ${finalProducts.length} high-quality products`);
    console.log(`📊 Strategy breakdown:`, getStrategyBreakdown(finalProducts));
    
    // Return final products (limit to 4)
    return finalProducts.slice(0, 4).map(p => ({
      name: p.name,
      url: p.url,
      image_url: p.image_url,
      description: p.description,
      price: p.price,
      source: p.strategy,
      confidence: p.confidence
    }));

  } catch (err) {
    console.error("❌ Hybrid scraper error:", err.message);
    return [];
  }
}

function detectPlatform($, domain) {
  const generatorMeta = $('meta[name="generator"]').attr("content") || "";
  const poweredBy = $('meta[name="powered-by"]').attr("content") || "";
  const allMeta = (generatorMeta + " " + poweredBy).toLowerCase();
  
  const bodyClass = $('body').attr('class') || "";
  const bodyData = Object.keys($('body')[0]?.attribs || {}).join(' ');
  const bodyInfo = (bodyClass + " " + bodyData).toLowerCase();
  
  const scripts = [];
  $('script[src]').each((i, el) => {
    scripts.push($(el).attr('src'));
  });
  $('script:not([src])').each((i, el) => {
    scripts.push($(el).html());
  });
  const scriptInfo = scripts.join(' ').toLowerCase();
  
  const allContent = (allMeta + " " + bodyInfo + " " + scriptInfo).toLowerCase();
  
  if (allContent.includes('shopify')) return 'shopify';
  if (allContent.includes('woocommerce') || allContent.includes('wc-')) return 'woocommerce';
  if (allContent.includes('magento')) return 'magento';
  if (allContent.includes('bigcommerce')) return 'bigcommerce';
  if (allContent.includes('squarespace')) return 'squarespace';
  if (allContent.includes('nike') || domain.includes('nike.com')) return 'nike';
  if (allContent.includes('etsy') || domain.includes('etsy.com')) return 'etsy';
  if (allContent.includes('amazon') || domain.includes('amazon.com')) return 'amazon';
  if (allContent.includes('target') || domain.includes('target.com')) return 'target';
  
  return null;
}

function extractStructuredData($, domain) {
  const products = [];
  
  // JSON-LD structured data
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const product = processStructuredProduct(item, domain);
          if (product) products.push(product);
        } else if (item['@graph']) {
          for (const graphItem of item['@graph']) {
            if (graphItem['@type'] === 'Product') {
              const product = processStructuredProduct(graphItem, domain);
              if (product) products.push(product);
            }
          }
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  
  // Microdata
  $('[itemtype*="Product"]').each((i, el) => {
    const $product = $(el);
    const name = $product.find('[itemprop="name"]').text().trim() ||
                 $product.find('[itemprop="title"]').text().trim();
    const url = absolute($product.find('[itemprop="url"]').attr('href') || 
                        $product.find('a').first().attr('href'), domain);
    const image = absolute($product.find('[itemprop="image"]').attr('src') ||
                          $product.find('img').first().attr('src'), domain);
    const description = $product.find('[itemprop="description"]').text().trim();
    const price = $product.find('[itemprop="price"]').text().trim();
    
    if (name && url && image && isValidProductName(name) && !isIgnoredUrl(url)) {
      products.push({
        name,
        url,
        image_url: image,
        description,
        price
      });
    }
  });
  
  return products.filter(p => p && p.name && p.url && p.image_url);
}

async function extractFromSitemap(domain) {
  const products = [];
  
  try {
    // Try common sitemap locations
    const sitemapUrls = [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/sitemap_index.xml`,
      `https://${domain}/sitemap-products.xml`,
      `https://${domain}/sitemap_products.xml`
    ];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await axios.get(sitemapUrl, { timeout: 10000 });
        const xml = response.data;
        
        // Extract product URLs from sitemap
        const productUrls = extractProductUrlsFromSitemap(xml);
        
        // Fetch first few product pages
        for (const productUrl of productUrls.slice(0, 3)) {
          try {
            const productResponse = await axios.get(productUrl, { timeout: 15000 });
            const $ = cheerio.load(productResponse.data);
            
            const product = extractProductFromPage($, domain);
            if (product) products.push(product);
          } catch (error) {
            // Skip failed product pages
          }
        }
        
        if (products.length > 0) break; // Found products, stop trying other sitemaps
      } catch (error) {
        // Try next sitemap
      }
    }
  } catch (error) {
    // Sitemap extraction failed, continue with other strategies
  }
  
  return products;
}

function extractProductUrlsFromSitemap(xml) {
  const urls = [];
  const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
  
  if (urlMatches) {
    for (const match of urlMatches) {
      const url = match.replace(/<loc>|<\/loc>/g, '');
      if (isProductUrl(url)) {
        urls.push(url);
      }
    }
  }
  
  return urls;
}

function extractProductFromPage($, domain) {
  const name = extractName($, UNIVERSAL_PATTERNS.nameSelectors);
  const image = extractBestImage($, UNIVERSAL_PATTERNS.imageSelectors, domain);
  const description = extractDescription($, ['.description', '.excerpt', 'p']);
  const price = extractPrice($, UNIVERSAL_PATTERNS.priceSelectors);
  
  if (name && isValidProductName(name)) {
    return {
      name,
      url: `https://${domain}${$('link[rel="canonical"]').attr('href') || ''}`,
      image_url: image,
      description,
      price
    };
  }
  
  return null;
}

function extractProductsPlatformSpecific($, domain, platform) {
  const config = PLATFORM_PATTERNS[platform];
  const products = [];
  const seenUrls = new Set();
  
  for (const selector of config.selectors) {
    $(selector).each((i, el) => {
      if (products.length >= 6) return;
      
      const $el = $(el);
      const $parent = $el.closest('article, .product, .item, .card, li').length ? 
                     $el.closest('article, .product, .item, .card, li') : $el;
      
      const url = absolute($el.attr('href'), domain);
      if (!url || !isProductUrl(url, config.productUrl) || seenUrls.has(url)) return;
      
      const name = extractName($parent, config.nameSelectors);
      const image = extractBestImage($parent, config.imageSelectors, domain);
      const description = extractDescription($parent, config.descriptionSelectors);
      const price = extractPrice($parent, config.priceSelectors);
      
      if (name && isValidProductName(name) && !isIgnoredUrl(url)) {
        seenUrls.add(url);
        products.push({
          name,
          url,
          image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
          description,
          price
        });
      }
    });
  }
  
  return products;
}

function extractProductsAdvancedGeneric($, domain) {
  const products = [];
  const seenUrls = new Set();
  
  for (const selector of UNIVERSAL_PATTERNS.productSelectors) {
    $(selector).each((i, el) => {
      if (products.length >= 6) return;
      
      const $el = $(el);
      const $parent = $el.closest('article, .product, .item, .card, li, div').length ? 
                     $el.closest('article, .product, .item, .card, li, div') : $el;
      
      const url = absolute($el.attr('href'), domain);
      if (!url || !isGenericProductUrl(url) || seenUrls.has(url)) return;
      
      const name = extractName($parent, UNIVERSAL_PATTERNS.nameSelectors);
      const image = extractBestImage($parent, UNIVERSAL_PATTERNS.imageSelectors, domain);
      const description = extractDescription($parent, ['.description', '.excerpt', 'p']);
      const price = extractPrice($parent, UNIVERSAL_PATTERNS.priceSelectors);
      
      if (name && isValidProductName(name) && !isIgnoredUrl(url)) {
        seenUrls.add(url);
        products.push({
          name,
          url,
          image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
          description,
          price
        });
      }
    });
  }
  
  return products;
}

function extractProductsWithAI($, domain) {
  const products = [];
  
  $('div, article, section').each((i, el) => {
    if (products.length >= 6) return;
    
    const $el = $(el);
    const text = $el.text().trim();
    
    if (text.length > 500) return;
    
    const hasImage = $el.find('img').length > 0;
    const hasLink = $el.find('a').length > 0;
    const hasTitle = $el.find('h1, h2, h3, h4, .title, .name').length > 0;
    const hasPrice = /\$[\d,]+(\.\d{2})?/.test(text);
    
    if (hasImage && hasLink && hasTitle) {
      const $link = $el.find('a').first();
      const url = absolute($link.attr('href'), domain);
      const name = extractName($el, UNIVERSAL_PATTERNS.nameSelectors);
      const image = extractBestImage($el, UNIVERSAL_PATTERNS.imageSelectors, domain);
      
      if (name && url && isValidProductName(name) && !isIgnoredUrl(url)) {
        products.push({
          name,
          url,
          image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
          description: '',
          price: hasPrice ? text.match(/\$[\d,]+(\.\d{2})?/)?.[0] : ''
        });
      }
    }
  });
  
  return products;
}

function extractProductsIntelligent($, domain) {
  const products = [];
  
  $("a:has(img)").each((i, el) => {
    if (products.length >= 6) return;
    
    const $el = $(el);
    const url = absolute($el.attr("href"), domain);
    
    if (!url || isIgnoredUrl(url)) return;
    
    const name = $el.find("img").attr("alt") || 
                 $el.text().trim() || 
                 $el.find('h1, h2, h3, h4, .title, .name').first().text().trim();
    
    const image = extractBestImage($el, ['img'], domain);
    const description = $('meta[property="og:description"]').attr("content") || "";
    
    const hasProductKeywords = /product|item|goods|merchandise|buy|shop/i.test(url);
    const hasLongUrl = url.length > 20;
    const hasImageAlt = $el.find("img").attr("alt") && $el.find("img").attr("alt").length > 3;
    
    if (url && name && isValidProductName(name) && (hasProductKeywords || hasLongUrl || hasImageAlt)) {
      products.push({
        name,
        url,
        image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
        description
      });
    }
  });
  
  return products;
}

function filterAndValidateProducts(products, domain) {
  return products.filter(product => {
    // Basic validation
    if (!product.name || !product.url || !product.image_url) return false;
    
    // URL validation
    if (isIgnoredUrl(product.url)) return false;
    
    // Name validation
    if (!isValidProductName(product.name)) return false;
    
    // Image validation
    if (product.image_url.includes('placeholder') || product.image_url.includes('logo')) return false;
    
    return true;
  });
}

function scoreAndRankProducts(products) {
  return products.map(product => {
    let score = product.confidence || 0.5;
    
    // Boost score for better strategies
    if (product.strategy === 'structured') score += 0.2;
    if (product.strategy === 'platform') score += 0.15;
    if (product.strategy === 'sitemap') score += 0.1;
    
    // Boost score for product indicators
    const text = (product.name + ' ' + product.description + ' ' + product.url).toLowerCase();
    const productIndicators = FILTER_PATTERNS.productIndicators.filter(indicator => 
      text.includes(indicator.toLowerCase())
    );
    score += productIndicators.length * 0.05;
    
    // Reduce score for non-product indicators
    const nonProductIndicators = FILTER_PATTERNS.nonProductIndicators.filter(indicator => 
      text.includes(indicator.toLowerCase())
    );
    score -= nonProductIndicators.length * 0.1;
    
    // Boost score for price presence
    if (product.price) score += 0.1;
    
    // Boost score for good image
    if (product.image_url && !product.image_url.includes('placeholder')) score += 0.05;
    
    // Boost score for longer, more descriptive names
    if (product.name.length > 10) score += 0.05;
    
    return {
      ...product,
      confidence: Math.max(0, Math.min(1, score))
    };
  }).sort((a, b) => b.confidence - a.confidence);
}

function deduplicateProducts(products) {
  const seen = new Set();
  const deduplicated = [];
  
  for (const product of products) {
    const key = `${product.name}-${product.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(product);
    }
  }
  
  return deduplicated;
}

function getStrategyBreakdown(products) {
  const breakdown = {};
  products.forEach(p => {
    breakdown[p.strategy] = (breakdown[p.strategy] || 0) + 1;
  });
  return breakdown;
}

// Helper functions
function processStructuredProduct(item, domain) {
  const name = item.name;
  const url = absolute(item.url, domain);
  
  if (!name || !url || !isValidProductName(name) || isIgnoredUrl(url)) {
    return null;
  }
  
  return {
    name,
    url,
    image_url: absolute(getImageFromStructured(item.image), domain),
    description: item.description || '',
    price: item.offers ? (item.offers.price || item.offers[0]?.price) : ''
  };
}

function getImageFromStructured(imageData) {
  if (!imageData) return '';
  if (typeof imageData === 'string') return imageData;
  if (Array.isArray(imageData)) return imageData[0]?.url || imageData[0];
  return imageData.url || imageData.contentUrl || '';
}

function extractName($parent, selectors) {
  for (const selector of selectors) {
    const text = $parent.find(selector).first().text().trim();
    if (text && text.length > 2) return cleanText(text);
  }
  const fallback = $parent.find('h1, h2, h3, h4').first().text().trim() || 
                   $parent.text().trim().split('\n')[0].trim();
  return cleanText(fallback);
}

function cleanText(text) {
  if (!text) return '';
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&quot;/g, '"')
              .replace(/&#x27;/g, "'")
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function extractBestImage($parent, selectors, domain) {
  let bestImage = '';
  
  for (const selector of selectors) {
    const $img = $parent.find(selector).first();
    if ($img.length) {
      let src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy-src') || 
                $img.attr('data-original') || 
                $img.attr('data-image') || 
                $img.attr('data-img');
      
      if (src && (src.startsWith('data:image/gif;base64') || src.includes('placeholder'))) {
        continue;
      }
      
      const srcset = $img.attr('srcset') || $img.attr('data-srcset');
      if (srcset) {
        const candidates = srcset.split(',').map(x => {
          const parts = x.trim().split(' ');
          return { url: parts[0], width: parseInt(parts[1]) || 0 };
        });
        const largest = candidates.reduce((max, curr) => 
          curr.width > max.width ? curr : max, candidates[0]);
        src = largest.url;
      }
      
      if (src) {
        bestImage = absolute(src, domain);
        bestImage = bestImage.replace(/_\d+x\d+(@\d+x)?\.(jpg|jpeg|png|webp)/i, '.$2');
        break;
      }
    }
  }
  
  return bestImage;
}

function extractDescription($parent, selectors) {
  for (const selector of selectors) {
    const text = $parent.find(selector).first().text().trim();
    if (text && text.length > 10) return text;
  }
  return '';
}

function extractPrice($parent, selectors) {
  for (const selector of selectors) {
    const text = $parent.find(selector).first().text().trim();
    if (text && /[\$£€¥₹]/.test(text)) return text;
  }
  return '';
}

function absolute(urlPart, domain) {
  if (!urlPart) return "";
  if (urlPart.startsWith("http")) return urlPart;
  if (urlPart.startsWith("//")) return "https:" + urlPart;
  if (urlPart.startsWith("/")) return `https://${domain}${urlPart}`;
  return urlPart;
}

function isProductUrl(url, pattern) {
  if (!pattern) return true;
  return pattern.test(url);
}

function isGenericProductUrl(url) {
  return UNIVERSAL_PATTERNS.productUrlPatterns.some(pattern => pattern.test(url));
}

function isIgnoredUrl(url) {
  const lowerUrl = url.toLowerCase();
  return FILTER_PATTERNS.ignoredUrls.some(pattern => lowerUrl.includes(pattern));
}

function isValidProductName(name) {
  if (!name || name.length < 3) return false;
  
  const lowerName = name.toLowerCase().trim();
  
  // Check against ignored names
  if (FILTER_PATTERNS.ignoredNames.some(invalid => 
    lowerName === invalid || 
    lowerName.includes(invalid) && lowerName.length < invalid.length + 10
  )) {
    return false;
  }
  
  // Check for names that are mostly numbers or special characters
  if (/^[\d\s\-_.,]+$/.test(lowerName)) return false;
  
  // Check for names that are just single words that are likely UI elements
  const singleWords = ['more', 'all', 'new', 'sale', 'hot', 'best'];
  if (singleWords.includes(lowerName)) return false;
  
  // Check for navigation/category patterns
  const navigationPatterns = [
    /^shop\s+by/i,
    /^shop\s+for/i,
    /^browse\s+by/i,
    /^browse\s+for/i,
    /^view\s+all/i,
    /^see\s+all/i,
    /^all\s+products/i,
    /^new\s+arrivals/i,
    /^trending/i,
    /^featured/i,
    /^popular/i,
    /^sale/i,
    /^clearance/i,
    /^deals/i,
    /^offers/i
  ];
  
  if (navigationPatterns.some(pattern => pattern.test(lowerName))) {
    return false;
  }
  
  // Check for names that are too generic (likely navigation)
  const genericPatterns = [
    /^shop\s+men$/i,
    /^shop\s+women$/i,
    /^shop\s+kids$/i,
    /^shop\s+boys$/i,
    /^shop\s+girls$/i,
    /^men$/i,
    /^women$/i,
    /^kids$/i,
    /^boys$/i,
    /^girls$/i
  ];
  
  if (genericPatterns.some(pattern => pattern.test(lowerName))) {
    return false;
  }
  
  return true;
}
