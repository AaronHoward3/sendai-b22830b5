import { scrapeProductsFromDomain } from "../utils/hybridProductScraper.js";
import { scrapeProductsFromDomain as legacyScrapeProducts } from "../utils/productScraper.js";
import { scrapeProductsFromDomain as enhancedScrapeProducts } from "../utils/enhancedProductScraper.js";

export async function scrapeProducts(req, res) {
  const { domain, useLegacy, useEnhanced, maxProducts = 6, minConfidence = 0.4 } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  try {
    let products;
    let scraperType;

    if (useLegacy) {
      // Use legacy scraper
      products = await legacyScrapeProducts(domain);
      scraperType = 'legacy';
    } else if (useEnhanced) {
      // Use enhanced scraper
      products = await enhancedScrapeProducts(domain);
      scraperType = 'enhanced';
    } else {
      // Use hybrid scraper (default)
      products = await scrapeProductsFromDomain(domain, { 
        maxProducts, 
        minConfidence 
      });
      scraperType = 'hybrid';
    }
    
    console.log(`✅ Successfully scraped ${products.length} products from ${domain} using ${scraperType} scraper`);
    
    res.json({ 
      products,
      count: products.length,
      domain,
      scraper: scraperType,
      confidence: products.length > 0 ? products[0].confidence : null
    });
  } catch (err) {
    console.error("❌ Product scrape error:", err.message);
    
    // If hybrid scraper fails, try enhanced as fallback
    if (!useLegacy && !useEnhanced) {
      console.log("🔄 Falling back to enhanced scraper...");
      try {
        const products = await enhancedScrapeProducts(domain);
        return res.json({ 
          products,
          count: products.length,
          domain,
          scraper: 'enhanced-fallback',
          warning: 'Hybrid scraper failed, used enhanced fallback'
        });
      } catch (fallbackErr) {
        console.error("❌ Enhanced fallback also failed:", fallbackErr.message);
        
        // Try legacy as last resort
        console.log("🔄 Falling back to legacy scraper...");
        try {
          const products = await legacyScrapeProducts(domain);
          return res.json({ 
            products,
            count: products.length,
            domain,
            scraper: 'legacy-fallback',
            warning: 'Hybrid and enhanced scrapers failed, used legacy fallback'
          });
        } catch (legacyErr) {
          console.error("❌ Legacy fallback also failed:", legacyErr.message);
        }
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
    
    // Test all three scrapers for comparison
    const [hybridResults, enhancedResults, legacyResults] = await Promise.allSettled([
      scrapeProductsFromDomain(domain, { maxProducts: 6, minConfidence: 0.4 }),
      enhancedScrapeProducts(domain),
      legacyScrapeProducts(domain)
    ]);
    
    const endTime = Date.now();
    
    const response = {
      domain,
      executionTime: `${endTime - startTime}ms`,
      hybrid: {
        status: hybridResults.status,
        products: hybridResults.status === 'fulfilled' ? hybridResults.value : [],
        count: hybridResults.status === 'fulfilled' ? hybridResults.value.length : 0,
        error: hybridResults.status === 'rejected' ? hybridResults.reason.message : null,
        avgConfidence: hybridResults.status === 'fulfilled' && hybridResults.value.length > 0 ? 
          hybridResults.value.reduce((sum, p) => sum + (p.confidence || 0), 0) / hybridResults.value.length : 0
      },
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
        hybridAdvantage: response.hybrid.count - Math.max(response.enhanced.count, response.legacy.count),
        commonProducts: findCommonProducts(response.hybrid.products, response.enhanced.products),
        uniqueToHybrid: response.hybrid.products.filter(p => 
          !response.enhanced.products.some(ep => ep.name === p.name || ep.url === p.url) &&
          !response.legacy.products.some(lp => lp.name === p.name || lp.url === p.url)
        ),
        uniqueToEnhanced: response.enhanced.products.filter(p => 
          !response.hybrid.products.some(hp => hp.name === p.name || hp.url === p.url) &&
          !response.legacy.products.some(lp => lp.name === p.name || lp.url === p.url)
        ),
        uniqueToLegacy: response.legacy.products.filter(p => 
          !response.hybrid.products.some(hp => hp.name === p.name || hp.url === p.url) &&
          !response.enhanced.products.some(ep => ep.name === p.name || ep.url === p.url)
        )
      };
    }
    
    console.log(`🧪 Test results for ${domain}:`);
    console.log(`   Hybrid: ${response.hybrid.count} products (avg confidence: ${(response.hybrid.avgConfidence * 100).toFixed(1)}%)`);
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

function findCommonProducts(hybrid, enhanced) {
  return hybrid.filter(hp => 
    enhanced.some(ep => 
      ep.name === hp.name || 
      ep.url === hp.url ||
      (ep.name && hp.name && ep.name.toLowerCase().includes(hp.name.toLowerCase()))
    )
  );
}
