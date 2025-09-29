// src/utils/templateCache.js

const templateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedTemplate(key) {
  const cached = templateCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  return null;
}

export function setCachedTemplate(key, content) {
  templateCache.set(key, {
    content,
    timestamp: Date.now()
  });
}

export function clearCache() {
  templateCache.clear();
}
