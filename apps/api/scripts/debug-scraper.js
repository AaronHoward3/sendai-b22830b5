#!/usr/bin/env node

import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function debugScraper(domain) {
  console.log(`🔍 Debugging scraper for ${domain}...\n`);
  
  try {
    const scrapingbeeApiKey = process.env.SCRAPINGBEE_API_KEY;
    const url = `https://${domain}`;

    console.log("📡 Fetching from ScrapingBee...");
    
    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/`,
      {
        params: {
          api_key: scrapingbeeApiKey,
          url: url,
          render_js: false,
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
    
    console.log(`📄 HTML length: ${html.length} characters`);
    console.log(`🎯 Title: ${$('title').text()}`);
    
    // Check for common product indicators
    console.log("\n🔍 Product Detection Analysis:");
    console.log(`- Links with /products/: ${$('a[href*="/products/"]').length}`);
    console.log(`- Links with /t/: ${$('a[href*="/t/"]').length}`);
    console.log(`- Links with /product/: ${$('a[href*="/product/"]').length}`);
    console.log(`- Links with /item/: ${$('a[href*="/item/"]').length}`);
    console.log(`- Links with /shop/: ${$('a[href*="/shop/"]').length}`);
    console.log(`- Product cards: ${$('.product, .product-card, .item').length}`);
    console.log(`- Images with 'product' in class: ${$('img[class*="product"]').length}`);
    
    // Check for structured data
    console.log(`- JSON-LD scripts: ${$('script[type="application/ld+json"]').length}`);
    console.log(`- Microdata products: ${$('[itemtype*="Product"]').length}`);
    
    // Show some sample links
    console.log("\n🔗 Sample Links:");
    $('a[href*="/products/"], a[href*="/t/"], a[href*="/item"], a[href*="/product"], a[href*="/shop"]').slice(0, 10).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 50);
      console.log(`  ${i + 1}. ${text} -> ${href}`);
    });
    
    // Show all links to understand the structure
    console.log("\n🔗 All Links (first 20):");
    $('a[href]').slice(0, 20).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 30);
      console.log(`  ${i + 1}. ${text} -> ${href}`);
    });
    
    // Show some sample images
    console.log("\n🖼️ Sample Images:");
    $('img').slice(0, 5).each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || 'No alt';
      console.log(`  ${i + 1}. ${alt.substring(0, 30)} -> ${src?.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${error.response.data}`);
    }
  }
}

// Test with Nike category page
debugScraper('nike.com/w/new-3n82y');
