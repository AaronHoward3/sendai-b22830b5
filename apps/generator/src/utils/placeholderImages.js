// src/utils/placeholderImages.js
import fs from 'fs';
import path from 'path';

let placeholderUrls = null;

function loadPlaceholderUrls() {
  if (placeholderUrls) return placeholderUrls;
  
  try {
    const configPath = path.join(process.cwd(), 'placeholder-images-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    placeholderUrls = config;
    return placeholderUrls;
  } catch (error) {
    console.warn('⚠️ Could not load placeholder image config, using fallback URLs');
    // Fallback to external URLs if config not found
    placeholderUrls = {
      'product-placeholder.svg': 'https://via.placeholder.com/300x300?text=Product+Image',
      'hero-placeholder.svg': 'https://via.placeholder.com/600x400?text=Hero+Image',
      'product-placeholder-small.svg': 'https://via.placeholder.com/150x150?text=Product'
    };
    return placeholderUrls;
  }
}

export function getPlaceholderUrl(type = 'product') {
  const urls = loadPlaceholderUrls();
  
  switch (type) {
    case 'product':
      return urls['product-placeholder.svg'] || 'https://via.placeholder.com/300x300?text=Product+Image';
    case 'hero':
      return urls['hero-placeholder.svg'] || 'https://via.placeholder.com/600x400?text=Hero+Image';
    case 'product-small':
      return urls['product-placeholder-small.svg'] || 'https://via.placeholder.com/150x150?text=Product';
    default:
      return urls['product-placeholder.svg'] || 'https://via.placeholder.com/300x300?text=Product+Image';
  }
}

export function getProductPlaceholderUrl() {
  return getPlaceholderUrl('product');
}

export function getHeroPlaceholderUrl() {
  return getPlaceholderUrl('hero');
}

export function getSmallProductPlaceholderUrl() {
  return getPlaceholderUrl('product-small');
}
