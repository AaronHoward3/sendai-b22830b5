#!/usr/bin/env node

/**
 * Security Audit Script
 * Scans the codebase for common security vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VULNERABILITIES = {
  xss: {
    patterns: [
      /dangerouslySetInnerHTML/,
      /innerHTML/,
      /outerHTML/,
      /document\.write/
    ],
    severity: 'HIGH',
    description: 'Potential XSS vulnerability'
  },
  sqlInjection: {
    patterns: [
      /\.from\(.*\+/,
      /\.select\(.*\+/,
      /\.insert\(.*\+/,
      /\.update\(.*\+/,
      /\.delete\(.*\+/
    ],
    severity: 'HIGH',
    description: 'Potential SQL injection'
  },
  eval: {
    patterns: [
      /eval\(/,
      /Function\(/,
      /setTimeout\(.*,.*\)/,
      /setInterval\(.*,.*\)/
    ],
    severity: 'CRITICAL',
    description: 'Code execution vulnerability'
  },
  hardcodedSecrets: {
    patterns: [
      /password.*=.*['"][^'"]{8,}['"]/,
      /apiKey.*=.*['"][^'"]{8,}['"]/,
      /secret.*=.*['"][^'"]{8,}['"]/,
      /token.*=.*['"][^'"]{8,}['"]/
    ],
    severity: 'HIGH',
    description: 'Hardcoded secrets found'
  },
  weakCrypto: {
    patterns: [
      /Math\.random\(\)/,
      /crypto\.getRandomValues/,
      /md5/,
      /sha1/
    ],
    severity: 'MEDIUM',
    description: 'Weak cryptographic implementation'
  }
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  Object.entries(VULNERABILITIES).forEach(([type, vuln]) => {
    vuln.patterns.forEach(pattern => {
      // Use global flag for matchAll
      const globalPattern = new RegExp(pattern.source, 'g');
      const matches = content.matchAll(globalPattern);
      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          type,
          severity: vuln.severity,
          description: vuln.description,
          file: filePath,
          line,
          match: match[0]
        });
      }
    });
  });
  
  return issues;
}

function scanDirectory(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const issues = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (stat.isFile() && extensions.includes(path.extname(item))) {
        try {
          const fileIssues = scanFile(fullPath);
          issues.push(...fileIssues);
        } catch (error) {
          console.warn(`Could not scan ${fullPath}: ${error.message}`);
        }
      }
    }
  }
  
  walk(dir);
  return issues;
}

function generateReport(issues) {
  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };
  
  issues.forEach(issue => {
    severityCounts[issue.severity]++;
  });
  
  console.log('\n🔒 Security Audit Report');
  console.log('========================');
  console.log(`Total Issues Found: ${issues.length}`);
  console.log(`Critical: ${severityCounts.CRITICAL}`);
  console.log(`High: ${severityCounts.HIGH}`);
  console.log(`Medium: ${severityCounts.MEDIUM}`);
  console.log(`Low: ${severityCounts.LOW}`);
  
  if (issues.length > 0) {
    console.log('\n📋 Detailed Issues:');
    console.log('==================');
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.severity} - ${issue.type.toUpperCase()}`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Line: ${issue.line}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Match: ${issue.match}`);
    });
  } else {
    console.log('\n✅ No security vulnerabilities found!');
  }
}

// Run the audit
const projectRoot = path.join(__dirname, '..');
console.log('🔍 Scanning for security vulnerabilities...');
const issues = scanDirectory(projectRoot);
generateReport(issues);
