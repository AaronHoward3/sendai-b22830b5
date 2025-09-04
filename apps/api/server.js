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

const app = express();
const PORT = process.env.PORT || 3001;

// --------- Stripe webhook needs raw body ----------
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  req.rawBody = req.body;
  stripeWebhook(req, res);
});

// --------- Normal middleware ----------
app.use(securityHeaders); // Apply security headers first
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin/curl
      return normalizeOrigin(origin) === clientUrl
        ? cb(null, true)
        : cb(new Error("CORS: origin not allowed"));
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
app.use("/api/generate", requireAuth, generateRoutes);

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
console.log("🔐 API Keys / Config:");
console.log(`- BRANDDEV_API_KEY: ${process.env.BRANDDEV_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? "✅ yes" : "❌ no"}`);
console.log(`- SCRAPINGBEE_API_KEY: ${process.env.SCRAPINGBEE_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL}`);

console.log("\n📡 Available Routes (high level):");
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
