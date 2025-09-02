import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// your existing imports (keep these)
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

dotenv.config();

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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// --------- Routes ----------
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/generate", requireAuth, generateRoutes);

// ✅ FIX: mount billing under /api/billing so /api/billing/checkout exists
app.use("/api/billing", billingRoutes);

app.use("/api", creditsRoutes);
app.use("/api", imagesRoutes);
app.use("/api/admin", requireAuth, requireAdminUser, adminRoutes);

// --------- Health checks (both direct and /api/*) ----------
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
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL}`);

console.log("\n📡 Available Routes:");
console.log("- POST /api/brand/check");
console.log("- POST /api/products/scrape");
console.log("- POST /api/generate   (protected)");
console.log("- /api/admin/*         (protected + admin)");
console.log("- POST /api/billing/checkout");
console.log("- POST /api/billing/portal");
console.log("- POST /webhooks/stripe (raw body)");

app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
  console.log(`🌐 Allowing frontend origin: ${process.env.CLIENT_URL}`);
});
