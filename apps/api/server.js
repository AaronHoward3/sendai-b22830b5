import express from "express";
import cors from "cors";
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
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_CLIENT_URL = "http://localhost:5173";

const normalizeOrigin = (s = "") =>
  s.trim().replace(/\/$/, ""); // drop trailing slash

let clientUrl = normalizeOrigin(process.env.CLIENT_URL || "");
if (!clientUrl) {
  console.warn(`[API] CLIENT_URL not set. Defaulting to ${DEFAULT_CLIENT_URL}`);
  clientUrl = normalizeOrigin(DEFAULT_CLIENT_URL);
}
if (!/^https?:\/\//i.test(clientUrl)) {
  console.warn(`[API] CLIENT_URL missing scheme. Prefixing with http:// -> ${clientUrl}`);
  clientUrl = `http://${clientUrl}`;
}
clientUrl = normalizeOrigin(clientUrl);
process.env.CLIENT_URL = clientUrl;

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Env summary ----
console.log("🔐 API Keys / Config:");
console.log(`- BRANDDEV_API_KEY: ${process.env.BRANDDEV_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? "✅ yes" : "❌ no"}`);
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL}`);

// ---- Stripe webhook (raw body FIRST) ----
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  req.rawBody = req.body;
  stripeWebhook(req, res);
});

// ---- Normal middleware ----
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      const norm = normalizeOrigin(origin);
      return norm === clientUrl ? cb(null, true) : cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ---- Routes ----
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);

// ✅ Protect ALL /api/generate routes so req.user is present in controllers
app.use("/api/generate", requireAuth, generateRoutes);

app.use("/api", billingRoutes);
app.use("/api", creditsRoutes);
app.use("/api", imagesRoutes);

// ✅ Admin routes (role-based: requires logged-in user with profiles.is_admin = true)
app.use("/api/admin", requireAuth, requireAdminUser, adminRoutes);

// ✅ Health checks (support both direct and /api/*)
app.get("/healthz", (_req, res) => res.type("text").send("ok"));
app.get("/api/healthz", (_req, res) => res.type("text").send("ok"));

// ---- Route list ----
console.log("\n📡 Available Routes:");
console.log("- POST /api/brand/check");
console.log("- POST /api/products/scrape");
console.log("- POST /api/generate   (protected)");
console.log("- /api/admin/*         (protected + admin)");
console.log("- POST /api/billing/checkout");
console.log("- POST /api/billing/portal");
console.log("- POST /webhooks/stripe (raw body)");

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
  console.log(`🌐 Allowing frontend origin: ${process.env.CLIENT_URL}`);
});
