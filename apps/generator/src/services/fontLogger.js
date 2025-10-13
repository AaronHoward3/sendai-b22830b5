// src/services/fontLogger.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the font log file
const FONT_LOG_PATH = path.join(__dirname, '../../logs/font-matches.json');

/**
 * Log font detection and matching results for analysis
 * @param {string} brandUrl - The brand URL
 * @param {object} fontResults - The font matching results
 */
export async function logFontMatch(brandUrl, fontResults) {
  try {
    // Ensure logs directory exists
    const logsDir = path.dirname(FONT_LOG_PATH);
    await fs.mkdir(logsDir, { recursive: true });

    // Read existing log or create new one
    let logData = [];
    try {
      const existingLog = await fs.readFile(FONT_LOG_PATH, 'utf8');
      logData = JSON.parse(existingLog);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      logData = [];
    }

    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      brandUrl,
      detectedFonts: fontResults.details?.detectedFonts || {},
      headingMatch: fontResults.details?.headingMatch || {},
      bodyMatch: fontResults.details?.bodyMatch || {},
      finalFonts: {
        heading: fontResults.headingFontGuess,
        body: fontResults.bodyFontGuess,
        headingUrl: fontResults.headingFontUrl,
        bodyUrl: fontResults.bodyFontUrl
      },
      confidence: fontResults.confidence,
      method: fontResults.method,
      processingTime: fontResults.details?.processingTime || 0
    };

    // Add to log
    logData.push(logEntry);

    // Keep only last 1000 entries to prevent file from growing too large
    if (logData.length > 1000) {
      logData = logData.slice(-1000);
    }

    // Write back to file
    await fs.writeFile(FONT_LOG_PATH, JSON.stringify(logData, null, 2));

    console.log(`📝 Font match logged for ${brandUrl}`);
    
    // Also log to console for immediate visibility
    console.log(`\n📊 FONT MATCH SUMMARY:`);
    console.log(`   Brand: ${brandUrl}`);
    console.log(`   Heading: "${fontResults.details?.detectedFonts?.heading}" → "${fontResults.headingFontGuess}" (${fontResults.details?.headingMatch?.confidence || 0})`);
    console.log(`   Body: "${fontResults.details?.detectedFonts?.body}" → "${fontResults.bodyFontGuess}" (${fontResults.details?.bodyMatch?.confidence || 0})`);
    console.log(`   Overall confidence: ${fontResults.confidence}`);
    console.log(`   Method: ${fontResults.method}`);

  } catch (error) {
    console.error('❌ Error logging font match:', error.message);
  }
}

/**
 * Get font matching statistics
 */
export async function getFontStats() {
  try {
    const logData = await fs.readFile(FONT_LOG_PATH, 'utf8');
    const logs = JSON.parse(logData);

    const stats = {
      totalMatches: logs.length,
      mostUsedHeadingFonts: {},
      mostUsedBodyFonts: {},
      averageConfidence: 0,
      methodBreakdown: {},
      recentMatches: logs.slice(-10)
    };

    let totalConfidence = 0;

    logs.forEach(log => {
      // Count font usage
      if (log.finalFonts.heading) {
        stats.mostUsedHeadingFonts[log.finalFonts.heading] = (stats.mostUsedHeadingFonts[log.finalFonts.heading] || 0) + 1;
      }
      if (log.finalFonts.body) {
        stats.mostUsedBodyFonts[log.finalFonts.body] = (stats.mostUsedBodyFonts[log.finalFonts.body] || 0) + 1;
      }

      // Count methods
      if (log.method) {
        stats.methodBreakdown[log.method] = (stats.methodBreakdown[log.method] || 0) + 1;
      }

      // Sum confidence
      totalConfidence += log.confidence || 0;
    });

    stats.averageConfidence = logs.length > 0 ? totalConfidence / logs.length : 0;

    return stats;

  } catch (error) {
    console.error('❌ Error getting font stats:', error.message);
    return {
      totalMatches: 0,
      mostUsedHeadingFonts: {},
      mostUsedBodyFonts: {},
      averageConfidence: 0,
      methodBreakdown: {},
      recentMatches: []
    };
  }
}

/**
 * Print font matching statistics to console
 */
export async function printFontStats() {
  const stats = await getFontStats();
  
  console.log(`\n📈 === FONT MATCHING STATISTICS ===`);
  console.log(`Total matches: ${stats.totalMatches}`);
  console.log(`Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
  
  console.log(`\n🎯 Most used heading fonts:`);
  Object.entries(stats.mostUsedHeadingFonts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([font, count]) => {
      console.log(`   ${font}: ${count} times`);
    });

  console.log(`\n📝 Most used body fonts:`);
  Object.entries(stats.mostUsedBodyFonts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([font, count]) => {
      console.log(`   ${font}: ${count} times`);
    });

  console.log(`\n🔍 Detection methods:`);
  Object.entries(stats.methodBreakdown).forEach(([method, count]) => {
    console.log(`   ${method}: ${count} times`);
  });

  console.log(`\n📊 === END STATISTICS ===\n`);
}
