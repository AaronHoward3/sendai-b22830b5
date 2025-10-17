#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Track all child processes
const processes = [];
let isShuttingDown = false;

// Function to start a service
function startService(name, command, args, cwd) {
  console.log(`🚀 Starting ${name}...`);
  
  const child = spawn(command, args, {
    cwd: path.resolve(cwd),
    stdio: 'inherit',
    shell: true,
    detached: false
  });
  
  processes.push({ name, process: child });
  
  child.on('exit', (code) => {
    if (!isShuttingDown) {
      console.log(`❌ ${name} exited with code ${code}`);
    }
  });
  
  return child;
}

// Simple graceful shutdown handler
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 Received ${signal}. Shutting down all services...`);
  
  processes.forEach(({ name, process }) => {
    if (process.pid) {
      try {
        process.kill('SIGTERM');
        console.log(`🔪 Stopping ${name}...`);
      } catch (error) {
        console.log(`⚠️ Could not stop ${name}`);
      }
    }
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('⚡ Force exiting...');
    process.exit(0);
  }, 5000);
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start all services
console.log('🎯 Starting Sendai Development Environment...\n');

// Start API
startService('API', 'npm', ['run', 'dev'], 'apps/api');

// Start GeneratorV2
startService('GeneratorV2', 'npm', ['run', 'dev'], 'apps/generatorv2');

// Start Frontend
startService('Frontend', 'npm', ['run', 'dev'], 'apps/web');

console.log('\n💡 Press Ctrl+C to stop all services');
console.log('📡 Services will be available at:');
console.log('   - Frontend: http://localhost:5173');
console.log('   - API: http://localhost:3001');
console.log('   - GeneratorV2: http://localhost:3002\n');

// Keep the process alive
process.stdin.resume();
