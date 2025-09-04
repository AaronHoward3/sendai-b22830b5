#!/usr/bin/env node

import { scrapeProductsFromDomain } from "../utils/universalProductScraper.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

console.log('Starting simple test...');
console.log('SCRAPINGBEE_API_KEY:', process.env.SCRAPINGBEE_API_KEY ? 'SET' : 'NOT SET');

async function simpleTest() {
  try {
    console.log('Testing nike.com...');
    const products = await scrapeProductsFromDomain('nike.com', { maxProducts: 2 });
    console.log('Products found:', products.length);
    console.log('First product:', products[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

simpleTest();
