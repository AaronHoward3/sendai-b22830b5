import { scrapeProductsFromDomain } from "../utils/enhancedProductScraper.js";
import { scrapeProductsFromDomain as legacyScrapeProducts } from "../utils/productScraper.js";

export async function scrapeProducts(req, res) {
  const { domain, useLegacy } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  try {
    // Use enhanced scraper by default, with legacy fallback option
    const products = useLegacy 
      ? await legacyScrapeProducts(domain)
      : await scrapeProductsFromDomain(domain);
    
    console.log(`✅ Successfully scraped ${products.length} products from ${domain}`);
    
    res.json({ 
      products,
      count: products.length,
      domain,
      scraper: useLegacy ? 'legacy' : 'enhanced'
    });
  } catch (err) {
    console.error("❌ Product scrape error:", err.message);
    
    // If enhanced scraper fails, try legacy as fallback
    if (!useLegacy) {
      console.log("🔄 Falling back to legacy scraper...");
      try {
        const products = await legacyScrapeProducts(domain);
        return res.json({ 
          products,
          count: products.length,
          domain,
          scraper: 'legacy-fallback',
          warning: 'Enhanced scraper failed, used legacy fallback'
        });
      } catch (fallbackErr) {
        console.error("❌ Legacy fallback also failed:", fallbackErr.message);
      }
    }
    
    res.status(500).json({ 
      error: "Failed to scrape products",
      domain,
      details: err.message
    });
  }
}

export async function testScraper(req, res) {
  const { domain, platform, debug } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  try {
    const startTime = Date.now();
    
    // Test both scrapers for comparison
    const [enhancedResults, legacyResults] = await Promise.allSettled([
      scrapeProductsFromDomain(domain),
      legacyScrapeProducts(domain)
    ]);
    
    const endTime = Date.now();
    
    const response = {
      domain,
      executionTime: `${endTime - startTime}ms`,
      enhanced: {
        status: enhancedResults.status,
        products: enhancedResults.status === 'fulfilled' ? enhancedResults.value : [],
        count: enhancedResults.status === 'fulfilled' ? enhancedResults.value.length : 0,
        error: enhancedResults.status === 'rejected' ? enhancedResults.reason.message : null
      },
      legacy: {
        status: legacyResults.status,
        products: legacyResults.status === 'fulfilled' ? legacyResults.value : [],
        count: legacyResults.status === 'fulfilled' ? legacyResults.value.length : 0,
        error: legacyResults.status === 'rejected' ? legacyResults.reason.message : null
      }
    };
    
    if (debug) {
      response.comparison = {
        enhancedAdvantage: response.enhanced.count - response.legacy.count,
        commonProducts: findCommonProducts(response.enhanced.products, response.legacy.products),
        uniqueToEnhanced: response.enhanced.products.filter(p => 
          !response.legacy.products.some(lp => lp.name === p.name || lp.url === p.url)
        ),
        uniqueToLegacy: response.legacy.products.filter(p => 
          !response.enhanced.products.some(ep => ep.name === p.name || ep.url === p.url)
        )
      };
    }
    
    console.log(`🧪 Test results for ${domain}:`);
    console.log(`   Enhanced: ${response.enhanced.count} products`);
    console.log(`   Legacy: ${response.legacy.count} products`);
    
    res.json(response);
  } catch (err) {
    console.error("❌ Test scraper error:", err.message);
    res.status(500).json({ 
      error: "Failed to test scrapers",
      domain,
      details: err.message
    });
  }
}

function findCommonProducts(enhanced, legacy) {
  return enhanced.filter(ep => 
    legacy.some(lp => 
      lp.name === ep.name || 
      lp.url === ep.url ||
      (lp.name && ep.name && lp.name.toLowerCase().includes(ep.name.toLowerCase()))
    )
  );
}
