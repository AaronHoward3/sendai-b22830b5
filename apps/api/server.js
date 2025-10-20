import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// your existing imports (keep these as you have them)
import creditsRoutes from "./routes/creditsRoutes.js";
import imagesRoutes from "./routes/imagesRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import generateRoutes from "./routes/generateRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import contextRoutes from "./routes/contextRoutes.js";
import { requireAdminUser } from "./middleware/requireAdminUser.js";
import { stripeWebhook } from "./controllers/billingController.js";
import { requireAuth } from "./middleware/requireAuth.js";

// Security middleware imports
import { securityHeaders } from "./middleware/securityHeaders.js";
import { sanitizeRequestBody } from "./middleware/validation.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Load .env from parent directory (root of project)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const normalizeOrigin = (s = "") => s.trim().replace(/\/$/, "");
const DEFAULT_CLIENT_URL = "http://localhost:5173";

let clientUrl = normalizeOrigin(process.env.CLIENT_URL || DEFAULT_CLIENT_URL);
if (!/^https?:\/\//i.test(clientUrl)) clientUrl = `http://${clientUrl}`;
clientUrl = normalizeOrigin(clientUrl);
process.env.CLIENT_URL = clientUrl;

// Define allowed origins for CORS
const getAllowedOrigins = () => {
  // In development, allow all localhost origins
  if (process.env.NODE_ENV === 'development' || process.env.ALLOW_ALL_ORIGINS === 'true') {
    return true; // Allow all origins in development
  }
  
  const origins = [
    clientUrl, // Primary client URL
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Common React dev port
    "http://localhost:8080", // Common dev port
    "https://localhost:5173", // HTTPS dev
    "https://localhost:3000", // HTTPS dev
    "https://irios-a-i-web.vercel.app", // Vercel deployment
    "https://irios.ai", // New domain
  ];
  
  // Add production URLs if they exist
  if (process.env.PRODUCTION_URL) {
    origins.push(process.env.PRODUCTION_URL);
  }
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    origins.push(process.env.RENDER_EXTERNAL_URL);
  }
  
  // Remove duplicates and normalize
  return [...new Set(origins.map(normalizeOrigin))];
};

const app = express();
const PORT = process.env.PORT || 3001;

// --------- Stripe webhook needs raw body ----------
// Production-ready webhook handler that works with Render.com's JSON parsing
app.post("/stripe-webhook", express.json(), (req, res) => {
  // Render.com parses JSON at infrastructure level, so we need to handle this
  // Since Render.com parses JSON, we need to reconstruct the raw body
  // This is a workaround for Render.com's infrastructure-level JSON parsing
  const rawBody = JSON.stringify(req.body);
  req.rawBody = rawBody;
  
  stripeWebhook(req, res);
});

// Keep the old endpoint for backward compatibility
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  // Store the raw body for signature verification
  req.rawBody = req.body;
  
  // Convert Buffer to string if needed for signature verification
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString('utf8');
  } else if (typeof req.body === 'string') {
    req.rawBody = req.body;
  } else {
    // If it's an object, convert back to JSON string
    // This is the problematic case - Render.com parsed it
    req.rawBody = JSON.stringify(req.body);
  }
  
  stripeWebhook(req, res);
});

// --------- Normal middleware ----------
app.use(securityHeaders); // Apply security headers first
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin/curl
      
      const allowedOrigins = getAllowedOrigins();
      
      // If development mode allows all origins
      if (allowedOrigins === true) {
        return cb(null, true);
      }
      
      const normalizedOrigin = normalizeOrigin(origin);
      
      if (allowedOrigins.includes(normalizedOrigin)) {
        return cb(null, true);
      }
      
      // Log the rejected origin for debugging
      console.log(`🚫 CORS rejected origin: ${origin} (normalized: ${normalizedOrigin})`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
);
app.use(express.json());
app.use(sanitizeRequestBody); // Sanitize input after parsing JSON

// --------- Routes ----------
app.use("/api/brand", brandRoutes);   // existing mount (singular)
// ✅ NEW: plural alias so /api/brands/* works too
app.use("/api/brands", brandRoutes);

app.use("/api/products", productRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/context", contextRoutes);

// Billing lives under /api/billing so frontend path matches
app.use("/api/billing", billingRoutes);

app.use("/api", creditsRoutes);
app.use("/api", imagesRoutes);
app.use("/api/admin", requireAuth, requireAdminUser, adminRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// --------- Health checks ----------
app.get(["/health", "/healthz", "/api/health", "/api/healthz"], (_req, res) =>
  res.type("text").send("ok")
);
app.head(["/health", "/healthz", "/api/health", "/api/healthz"], (_req, res) =>
  res.status(200).end()
);

// --------- Startup logs ----------
console.log("\n📡 Available Routes:");
console.log("- /api/brand/* and /api/brands/* (alias) ✅");
console.log("- /api/products/*");
console.log("- /api/generate (protected)");
console.log("- /api/billing/checkout (POST, GET shim)");
console.log("- /api/billing/portal (POST, GET shim)");
console.log("- /webhooks/stripe (raw body)");

app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
  console.log(`🌐 Allowing frontend origin: ${process.env.CLIENT_URL}`);
});
