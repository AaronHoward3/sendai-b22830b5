#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function testAPIEndpoint() {
  console.log('🧪 Testing API endpoint with hybrid scraper...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/products/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'nike.com',
        maxProducts: 3,
        minConfidence: 0.6
      })
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ API Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Scraper: ${data.scraper}`);
    console.log(`Products found: ${data.count}`);
    console.log(`Confidence: ${data.confidence}`);
    
    if (data.products && data.products.length > 0) {
      console.log('\n📦 Sample Products:');
      data.products.slice(0, 2).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   URL: ${product.url}`);
        console.log(`   Image: ${product.image_url}`);
        console.log(`   Source: ${product.source}`);
        console.log(`   Confidence: ${(product.confidence * 100).toFixed(1)}%`);
        if (product.price) {
          console.log(`   Price: ${product.price}`);
        }
      });
    } else {
      console.log('\n❌ No products found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIEndpoint();
