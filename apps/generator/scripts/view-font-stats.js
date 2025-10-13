#!/usr/bin/env node

// Script to view font matching statistics
import { printFontStats } from '../src/services/fontLogger.js';

console.log('📊 Loading font matching statistics...\n');

try {
  await printFontStats();
} catch (error) {
  console.error('❌ Error loading font statistics:', error.message);
  process.exit(1);
}
