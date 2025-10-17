import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST before importing any services
dotenv.config();

import { generateEmailsController } from './controllers/emailController.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic concurrency limiting (only for non-Lambda environments)
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = process.env.NODE_ENV === "production" ? 30 : 20;

// Only apply concurrency limiting if not in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use((req, res, next) => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      console.warn(`Server at capacity - activeRequests: ${activeRequests}, max: ${MAX_CONCURRENT_REQUESTS}`);
      return res.status(503).json({
        error: "Server is busy. Please try again in a moment.",
        retryAfter: 30,
      });
    }
    activeRequests++;
    res.on("finish", () => { activeRequests--; });
    next();
  });
}

// CORS
const PROD_ORIGINS = [
  "https://irios-a-i-web.vercel.app",        // your web app
  // add your custom domain here later if you map one
  // "https://app.irios.ai"
  // keep any existing allowlist origins you truly need:
  // "https://mjml-generator-service.springbot.com",
  // "https://springbot.com"
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / server-to-server / curl
    if (process.env.NODE_ENV !== "production") return cb(null, true);
    return PROD_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("CORS not allowed"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// JSON parsing
app.use(
  express.json({
    limit: "10mb",
    strict: true,
    type: "application/json",
  })
);

// Compression in production
if (process.env.NODE_ENV === "production") {
  try {
    const compression = await import("compression");
    app.use(
      compression.default({
        // 🚫 Never compress SSE, or proxies will buffer it
        filter: (req, res) => {
          const isSse =
            (req.headers.accept || "").includes("text/event-stream") ||
            String(req.query.stream) === "1";
          if (isSse) return false;
          return compression.default.filter(req, res);
        },
      })
    );
    console.log("Compression middleware enabled (SSE disabled)");
  } catch (error) {
    console.warn("Compression not available, continuing without it", error.message);
  }
}

// ---------- Health endpoints (must be before 404) ----------
app.get("/healthz", (_req, res) => res.type("text").send("ok"));
app.get("/health", (_req, res) => res.json({ 
  status: "healthy", 
  service: "GeneratorV2 API",
  version: "2.0.0",
  environment: process.env.NODE_ENV || "development",
  isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  activeRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : activeRequests,
  maxConcurrentRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : MAX_CONCURRENT_REQUESTS,
}));

// Root health check
app.get("/", (req, res) => {
  const healthData = {
    status: "healthy",
    service: "GeneratorV2 API",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    activeRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : activeRequests,
    maxConcurrentRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : MAX_CONCURRENT_REQUESTS,
  };
  res.json(healthData);
});

// === Main Routes ===
// ✅ Main generation endpoint (replaces the old generator)
app.post("/generate", generateEmailsController);

// ✅ Alias for API compatibility
app.post("/api/generate-emails", generateEmailsController);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", {
    error: error.message,
    stack: error.stack,
    url: error?.url || req.url,
    method: req.method,
  });
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler (must remain last)
app.use((req, res) => {
  console.warn("Route not found:", { url: req.url, method: req.method });
  res.status(404).json({ error: "Route not found" });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 GeneratorV2 server running on port ${PORT}`);
  console.log(`📧 Main endpoint: POST /generate`);
  console.log(`🔗 API endpoint: POST /api/generate-emails`);
  console.log(`❤️ Health check: GET /health`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ GeneratorV2 server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon restart
