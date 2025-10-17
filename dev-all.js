#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Track all child processes
const processes = [];

// Function to start a service
function startService(name, command, args, cwd) {
  console.log(`🚀 Starting ${name}...`);
  
  const child = spawn(command, args, {
    cwd: path.resolve(cwd),
    stdio: 'inherit',
    shell: true
  });
  
  processes.push({ name, process: child });
  
  child.on('exit', (code) => {
    console.log(`❌ ${name} exited with code ${code}`);
  });
  
  return child;
}

// Start all services
console.log('🎯 Starting Sendai Development Environment...\n');

// Start API
startService('API', 'npm', ['run', 'dev'], 'apps/api');

// Start GeneratorV2
startService('GeneratorV2', 'npm', ['run', 'dev'], 'apps/generatorv2');

// Start Frontend
startService('Frontend', 'npm', ['run', 'dev'], 'apps/web');

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down all services...`);
  
  let shutdownCount = 0;
  const totalProcesses = processes.length;
  
  processes.forEach(({ name, process }) => {
    console.log(`🔪 Killing ${name}...`);
    
    // Try graceful shutdown first
    process.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (!process.killed) {
        console.log(`⚡ Force killing ${name}...`);
        process.kill('SIGKILL');
      }
    }, 5000);
    
    process.on('exit', () => {
      shutdownCount++;
      console.log(`✅ ${name} stopped`);
      
      if (shutdownCount === totalProcesses) {
        console.log('🎉 All services stopped successfully!');
        process.exit(0);
      }
    });
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing exit after timeout');
    process.exit(1);
  }, 10000);
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

console.log('\n💡 Press Ctrl+C to stop all services gracefully');
console.log('📡 Services will be available at:');
console.log('   - Frontend: http://localhost:5173');
console.log('   - API: http://localhost:3001');
console.log('   - GeneratorV2: http://localhost:3002\n');
