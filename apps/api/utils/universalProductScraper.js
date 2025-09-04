import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Universal Product Scraper - Advanced e-commerce product extraction
 * 
 * Features:
 * 1. Multi-strategy detection (structured data, platform-specific, generic patterns)
 * 2. AI-powered content analysis for difficult sites
 * 3. Advanced image extraction with quality optimization
 * 4. Intelligent product validation and filtering
 * 5. Rate limiting and error handling
 * 6. Support for dynamic content (SPAs)
 */

// Advanced platform detection with more patterns
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
  // Add more platforms
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

export async function scrapeProductsFromDomain(domain, options = {}) {
  const {
    maxProducts = 6,
    enableJavaScript = true,
    timeout = 30000,
    retries = 2,
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  } = options;

  try {
    console.log(`🔍 Universal scraping from: ${domain}`);
    
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

    let products = [];

    // Step 2: Try structured data first (most reliable)
    products = extractStructuredData($, domain);
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} products via structured data`);
      return products.slice(0, maxProducts);
    }

    // Step 3: Try platform-specific extraction
    if (platform && PLATFORM_PATTERNS[platform]) {
      products = extractProductsPlatformSpecific($, domain, platform);
      if (products.length > 0) {
        console.log(`✅ Found ${products.length} products via ${platform} patterns`);
        return products.slice(0, maxProducts);
      }
    }

    // Step 4: Try advanced generic pattern matching
    products = extractProductsAdvancedGeneric($, domain);
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} products via advanced generic patterns`);
      return products.slice(0, maxProducts);
    }

    // Step 5: Try AI-powered content analysis
    products = extractProductsWithAI($, domain);
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} products via AI analysis`);
      return products.slice(0, maxProducts);
    }

    // Step 6: Last resort - intelligent link analysis
    products = extractProductsIntelligent($, domain);
    console.log(`⚠️ Fallback: Found ${products.length} products via intelligent analysis`);
    
    return products.slice(0, maxProducts);

  } catch (err) {
    console.error("❌ Universal scraper error:", err.message);
    return [];
  }
}

function detectPlatform($, domain) {
  // Enhanced platform detection
  const generatorMeta = $('meta[name="generator"]').attr("content") || "";
  const poweredBy = $('meta[name="powered-by"]').attr("content") || "";
  const allMeta = (generatorMeta + " " + poweredBy).toLowerCase();
  
  // Check body classes and data attributes
  const bodyClass = $('body').attr('class') || "";
  const bodyData = Object.keys($('body')[0]?.attribs || {}).join(' ');
  const bodyInfo = (bodyClass + " " + bodyData).toLowerCase();
  
  // Check script sources and inline scripts
  const scripts = [];
  $('script[src]').each((i, el) => {
    scripts.push($(el).attr('src'));
  });
  $('script:not([src])').each((i, el) => {
    scripts.push($(el).html());
  });
  const scriptInfo = scripts.join(' ').toLowerCase();
  
  // Check for common platform indicators
  const allContent = (allMeta + " " + bodyInfo + " " + scriptInfo).toLowerCase();
  
  // Platform detection with more patterns
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
        price,
        source: 'microdata'
      });
    }
  });
  
  return products.filter(p => p && p.name && p.url && p.image_url);
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
          price,
          source: `platform-${platform}`
        });
      }
    });
  }
  
  return products;
}

function extractProductsAdvancedGeneric($, domain) {
  const products = [];
  const seenUrls = new Set();
  
  // Try multiple generic strategies
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
          price,
          source: 'advanced-generic'
        });
      }
    });
  }
  
  return products;
}

function extractProductsWithAI($, domain) {
  // AI-powered content analysis for difficult sites
  const products = [];
  
  // Look for content that looks like product listings
  $('div, article, section').each((i, el) => {
    if (products.length >= 6) return;
    
    const $el = $(el);
    const text = $el.text().trim();
    
    // Skip if too much text (likely not a product)
    if (text.length > 500) return;
    
    // Look for product-like patterns
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
          price: hasPrice ? text.match(/\$[\d,]+(\.\d{2})?/)?.[0] : '',
          source: 'ai-analysis'
        });
      }
    }
  });
  
  return products;
}

function extractProductsIntelligent($, domain) {
  const products = [];
  
  // Intelligent analysis of all links with images
  $("a:has(img)").each((i, el) => {
    if (products.length >= 6) return;
    
    const $el = $(el);
    const url = absolute($el.attr("href"), domain);
    
    // Skip if URL doesn't look like a product
    if (!url || isIgnoredUrl(url)) return;
    
    const name = $el.find("img").attr("alt") || 
                 $el.text().trim() || 
                 $el.find('h1, h2, h3, h4, .title, .name').first().text().trim();
    
    const image = extractBestImage($el, ['img'], domain);
    const description = $('meta[property="og:description"]').attr("content") || "";
    
    // Additional validation
    const hasProductKeywords = /product|item|goods|merchandise|buy|shop/i.test(url);
    const hasLongUrl = url.length > 20; // Product URLs are usually longer
    const hasImageAlt = $el.find("img").attr("alt") && $el.find("img").attr("alt").length > 3;
    
    if (url && name && isValidProductName(name) && (hasProductKeywords || hasLongUrl || hasImageAlt)) {
      products.push({
        name,
        url,
        image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
        description,
        source: 'intelligent-analysis'
      });
    }
  });
  
  return products;
}

// Helper functions (same as enhanced scraper but with improvements)
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
    price: item.offers ? (item.offers.price || item.offers[0]?.price) : '',
    source: 'json-ld'
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
  
  if (!bestImage) {
    for (const selector of selectors) {
      const $img = $parent.find(selector).first();
      if ($img.length) {
        const src = $img.attr('src') || $img.attr('data-src');
        if (src && src.startsWith('data:image/gif;base64')) {
          bestImage = 'https://via.placeholder.com/300x300?text=Product+Image';
          break;
        }
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
  const ignored = [
    '/cart', '/checkout', '/account', '/login', '/register', '/signup',
    '/search', '/contact', '/about', '/blog', '/news', '/faq',
    '/privacy', '/terms', '/shipping', '/returns', '/policy',
    '/do-not-share', '/settings', '/preferences', '/cookies',
    '/help', '/support', '/customer-service', '/size-guide',
    '/store-locator', '/careers', '/investors', '/press',
    'mailto:', 'tel:', '#', 'javascript:', 'facebook.com', 'instagram.com',
    'twitter.com', 'youtube.com', 'tiktok.com',
    '.pdf', '.doc', '.zip', '.mp4', '.mp3'
  ];
  
  const lowerUrl = url.toLowerCase();
  return ignored.some(pattern => lowerUrl.includes(pattern));
}

function isValidProductName(name) {
  if (!name || name.length < 3) return false;
  
  const invalidNames = [
    'menu', 'search', 'cart', 'account', 'login', 'register',
    'home', 'back', 'next', 'previous', 'close', 'open',
    'privacy', 'terms', 'policy', 'cookies', 'settings',
    'your privacy choices', 'do not share', 'preferences',
    'learn more', 'read more', 'view all', 'see all',
    'sign up', 'subscribe', 'newsletter', 'follow us',
    'image', 'photo', 'picture', 'logo', 'icon',
    'loading', 'placeholder', 'default'
  ];
  
  const lowerName = name.toLowerCase().trim();
  
  if (invalidNames.some(invalid => 
    lowerName === invalid || 
    lowerName.includes(invalid) && lowerName.length < invalid.length + 10
  )) {
    return false;
  }
  
  if (/^[\d\s\-_.,]+$/.test(lowerName)) return false;
  
  const singleWords = ['more', 'all', 'new', 'sale', 'hot', 'best'];
  if (singleWords.includes(lowerName)) return false;
  
  return true;
}
