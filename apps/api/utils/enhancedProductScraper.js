import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Enhanced Product Scraper - Works with any e-commerce website
 * Uses multiple detection strategies:
 * 1. Platform-specific selectors (Shopify, WooCommerce, Magento, BigCommerce, etc.)
 * 2. Structured data parsing (JSON-LD, microdata)
 * 3. Generic pattern matching
 * 4. AI-powered content analysis (fallback)
 */

// Platform detection patterns
const PLATFORM_PATTERNS = {
  shopify: {
    meta: ['shopify'],
    selectors: [
      'a[href*="/products/"]',
      '.product-item a',
      '.product-card a',
      '.grid__item .card__content a'
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
      'li.product a'
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
  }
};

// Generic patterns for unknown platforms
const GENERIC_PATTERNS = {
  productSelectors: [
    'a[href*="product"]',
    'a[href*="item"]',
    'a[href*="shop"]',
    '.product a',
    '.item a',
    '.card a',
    'article a',
    '[data-product] a',
    '[data-item] a'
  ],
  productUrlPatterns: [
    /\/product[s]?\//,
    /\/item[s]?\//,
    /\/shop\//,
    /\/store\//,
    /\/catalog\//,
    /\/p\//,
    /\/t\//,  // Nike uses /t/ for products
    /\/buy\//,
    /\/detail[s]?\//,
    /\/goods\//,
    /\/merchandise\//,
    /\.html$/
  ],
  imageSelectors: [
    'img[alt*="product"]',
    'img[class*="product"]',
    'img[class*="item"]',
    '.product img',
    '.item img',
    '.card img',
    'article img'
  ],
  nameSelectors: [
    'h1', 'h2', 'h3', 'h4',
    '.title', '.name', '.product-name', '.item-name',
    '[class*="title"]', '[class*="name"]'
  ],
  priceSelectors: [
    '.price', '.cost', '.amount',
    '[class*="price"]', '[class*="cost"]',
    '[data-price]', '[itemprop="price"]'
  ]
};

export async function scrapeProductsFromDomain(domain) {
  try {
    const scrapingbeeApiKey = process.env.SCRAPINGBEE_API_KEY;
    const url = `https://${domain}`;

    console.log("🔍 Enhanced scraping from:", url);

    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/`,
      {
        params: {
          api_key: scrapingbeeApiKey,
          url: url,
          render_js: true,  // Enable JavaScript rendering
          premium_proxy: true,
          country_code: 'us'
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    // Step 1: Detect platform
    const platform = detectPlatform($, domain);
    console.log(`🎯 Detected platform: ${platform || 'Generic'}`);

    let products = [];

    // Step 2: Try structured data first (most reliable)
    products = extractStructuredData($, domain);
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} products via structured data`);
      return products.slice(0, 6);
    }

    // Step 3: Try platform-specific extraction
    if (platform && PLATFORM_PATTERNS[platform]) {
      products = extractProductsPlatformSpecific($, domain, platform);
      if (products.length > 0) {
        console.log(`✅ Found ${products.length} products via ${platform} patterns`);
        return products.slice(0, 6);
      }
    }

    // Step 4: Try generic pattern matching
    products = extractProductsGeneric($, domain);
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} products via generic patterns`);
      return products.slice(0, 6);
    }

    // Step 5: Last resort - any links with images
    products = extractLinksWithImages($, domain);
    console.log(`⚠️ Fallback: Found ${products.length} links with images`);
    
    return products.slice(0, 6);

  } catch (err) {
    console.error("❌ Enhanced scraper error:", err.message);
    return [];
  }
}

function detectPlatform($, domain) {
  const generatorMeta = $('meta[name="generator"]').attr("content") || "";
  const poweredBy = $('meta[name="powered-by"]').attr("content") || "";
  const allMeta = (generatorMeta + " " + poweredBy).toLowerCase();
  
  // Check body classes and data attributes
  const bodyClass = $('body').attr('class') || "";
  const bodyData = Object.keys($('body')[0]?.attribs || {}).join(' ');
  const bodyInfo = (bodyClass + " " + bodyData).toLowerCase();
  
  // Check script sources
  const scripts = [];
  $('script[src]').each((i, el) => {
    scripts.push($(el).attr('src'));
  });
  const scriptInfo = scripts.join(' ').toLowerCase();
  
  const allContent = (allMeta + " " + bodyInfo + " " + scriptInfo).toLowerCase();
  
  // Platform detection
  if (allContent.includes('shopify')) return 'shopify';
  if (allContent.includes('woocommerce') || allContent.includes('wc-')) return 'woocommerce';
  if (allContent.includes('magento')) return 'magento';
  if (allContent.includes('bigcommerce')) return 'bigcommerce';
  if (allContent.includes('squarespace')) return 'squarespace';
  if (allContent.includes('nike') || domain.includes('nike.com')) return 'nike';
  
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

function processStructuredProduct(item, domain) {
  const name = item.name;
  const url = absolute(item.url, domain);
  
  // Validate product before processing
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

function extractProductsGeneric($, domain) {
  const products = [];
  
  for (const selector of GENERIC_PATTERNS.productSelectors) {
    $(selector).each((i, el) => {
      if (products.length >= 6) return;
      
      const $el = $(el);
      const $parent = $el.closest('article, .product, .item, .card, li, div').length ? 
                     $el.closest('article, .product, .item, .card, li, div') : $el;
      
      const url = absolute($el.attr('href'), domain);
      if (!url || !isGenericProductUrl(url)) return;
      
      const name = extractName($parent, GENERIC_PATTERNS.nameSelectors);
      const image = extractBestImage($parent, GENERIC_PATTERNS.imageSelectors, domain);
      const description = extractDescription($parent, ['.description', '.excerpt', 'p']);
      const price = extractPrice($parent, GENERIC_PATTERNS.priceSelectors);
      
      if (name && isValidProductName(name) && !isIgnoredUrl(url)) {
        products.push({
          name,
          url,
          image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
          description,
          price,
          source: 'generic'
        });
      }
    });
  }
  
  return products;
}

function extractLinksWithImages($, domain) {
  const products = [];
  
  $("a:has(img)").each((i, el) => {
    if (products.length >= 6) return;
    
    const $el = $(el);
    const url = absolute($el.attr("href"), domain);
    const name = $el.find("img").attr("alt") || 
                 $el.text().trim() || 
                 $el.find('h1, h2, h3, h4, .title, .name').first().text().trim();
    
    const image = extractBestImage($el, ['img'], domain);
    const description = $('meta[property="og:description"]').attr("content") || "";
    
    if (url && name && isValidProductName(name) && !isIgnoredUrl(url)) {
      products.push({
        name,
        url,
        image_url: image || 'https://via.placeholder.com/300x300?text=Product+Image',
        description,
        source: 'fallback'
      });
    }
  });
  
  return products;
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
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text.replace(/&quot;/g, '"')
              .replace(/&#x27;/g, "'")
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function extractBestImage($parent, selectors, domain) {
  let bestImage = '';
  
  for (const selector of selectors) {
    const $img = $parent.find(selector).first();
    if ($img.length) {
      // Try multiple image sources in order of preference
      let src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy-src') || 
                $img.attr('data-original') || 
                $img.attr('data-image') || 
                $img.attr('data-img');
      
      // Skip placeholder images
      if (src && (src.startsWith('data:image/gif;base64') || src.includes('placeholder'))) {
        continue;
      }
      
      // Handle srcset for best quality
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
        // Clean up Shopify/common size suffixes
        bestImage = bestImage.replace(/_\d+x\d+(@\d+x)?\.(jpg|jpeg|png|webp)/i, '.$2');
        break;
      }
    }
  }
  
  // If no real image found, try to get a placeholder but mark it
  if (!bestImage) {
    for (const selector of selectors) {
      const $img = $parent.find(selector).first();
      if ($img.length) {
        const src = $img.attr('src') || $img.attr('data-src');
        if (src && src.startsWith('data:image/gif;base64')) {
          // Return a placeholder URL instead of null
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
  return GENERIC_PATTERNS.productUrlPatterns.some(pattern => pattern.test(url));
}

function isIgnoredUrl(url) {
  const ignored = [
    // E-commerce navigation
    '/cart', '/checkout', '/account', '/login', '/register', '/signup',
    '/search', '/contact', '/about', '/blog', '/news', '/faq',
    
    // Legal/Policy pages
    '/privacy', '/terms', '/shipping', '/returns', '/policy',
    '/do-not-share', '/settings', '/preferences', '/cookies',
    
    // Common non-product pages
    '/help', '/support', '/customer-service', '/size-guide',
    '/store-locator', '/careers', '/investors', '/press',
    
    // Social/External
    'mailto:', 'tel:', '#', 'javascript:', 'facebook.com', 'instagram.com',
    'twitter.com', 'youtube.com', 'tiktok.com',
    
    // File types
    '.pdf', '.doc', '.zip', '.mp4', '.mp3'
  ];
  
  const lowerUrl = url.toLowerCase();
  return ignored.some(pattern => lowerUrl.includes(pattern));
}

function isValidProductName(name) {
  if (!name || name.length < 3) return false;
  
  // Filter out common non-product text
  const invalidNames = [
    // Navigation/UI elements
    'menu', 'search', 'cart', 'account', 'login', 'register',
    'home', 'back', 'next', 'previous', 'close', 'open',
    
    // Legal/Policy text
    'privacy', 'terms', 'policy', 'cookies', 'settings',
    'your privacy choices', 'do not share', 'preferences',
    
    // Common UI text
    'learn more', 'read more', 'view all', 'see all',
    'sign up', 'subscribe', 'newsletter', 'follow us',
    
    // Empty or generic
    'image', 'photo', 'picture', 'logo', 'icon',
    'loading', 'placeholder', 'default'
  ];
  
  const lowerName = name.toLowerCase().trim();
  
  // Check for exact matches or if name is mostly these words
  if (invalidNames.some(invalid => 
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
  
  return true;
}
