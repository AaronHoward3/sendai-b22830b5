import express from "express";
import cors from "cors";
import emailRoutes from "./routes/emailRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import { generateEmailsFromEmailController } from "./controllers/emailController.js"; // <- alias target
import { requestContext, createLogger } from "./utils/logger.js";

const app = express();
const logger = createLogger("App");

// Basic concurrency limiting (only for non-Lambda environments)
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = process.env.NODE_ENV === "production" ? 30 : 20;

// Add request context middleware for logging
app.use(requestContext);

// Only apply concurrency limiting if not in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use((req, res, next) => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      logger.warn("Server at capacity", {
        activeRequests,
        maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
        requestId: req.headers["x-request-id"],
      });
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
    logger.info("Compression middleware enabled (SSE disabled)");
  } catch (error) {
    logger.warn("Compression not available, continuing without it", { error: error.message });
  }
}

// ---------- Health endpoints (must be before 404) ----------
app.get("/healthz", (_req, res) => res.type("text").send("ok"));
app.head("/healthz", (_req, res) => res.sendStatus(200));

// Root health check
app.get("/", (req, res) => {
  const startTime = performance.now();
  const healthData = {
    status: "healthy",
    service: "SBEmailGenerator API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    activeRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : activeRequests,
    maxConcurrentRequests: process.env.AWS_LAMBDA_FUNCTION_NAME ? "N/A (Lambda)" : MAX_CONCURRENT_REQUESTS,
  };
  const duration = performance.now() - startTime;
  logger.performance("Health check", duration, { requestId: req.headers["x-request-id"] });
  res.json(healthData);
});

// === Routes mounted under /api ===
app.use("/api", emailRoutes);
app.use("/api", brandRoutes);

// ✅ Alias: support orchestrator calls to POST /generate
// This directly calls the same controller used by /api/generate-emails.
app.post("/generate", generateEmailsFromEmailController);

// Extra health endpoint (JSON)
app.get("/health", (req, res) => {
  const startTime = performance.now();
  const healthData = { status: "healthy", activeRequests, maxConcurrentRequests: MAX_CONCURRENT_REQUESTS };
  const duration = performance.now() - startTime;
  logger.performance("Health endpoint", duration, { requestId: req.headers["x-request-id"] });
  res.json(healthData);
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error("Unhandled error", {
    requestId: req.headers["x-request-id"],
    error: error.message,
    stack: error.stack,
    url: error?.url || req.url,
    method: req.method,
  });
  res.status(500).json({ error: "Internal server error", requestId: req.headers["x-request-id"] });
});

// 404 handler (must remain last)
app.use((req, res) => {
  logger.warn("Route not found", { requestId: req.headers["x-request-id"], url: req.url, method: req.method });
  res.status(404).json({ error: "Route not found", requestId: req.headers["x-request-id"] });
});

export default app;
