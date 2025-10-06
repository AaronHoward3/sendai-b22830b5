// apps/api/routes/generateRoutes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireEmailCredit } from "../middleware/credits.js";
import { generateEmailsController } from "../controllers/generateController.js";
import { maybeConsumeImageCredit } from "../middleware/credits.js";
import { validateRequest, generateEmailSchema } from "../middleware/validation.js";
import { checkTrialUsage, markTrialUsed } from "../middleware/trialTracking.js";

const router = Router();

// Per-route limiter to prevent abuse & satisfy CodeQL alert
const generateLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  max: 5,                    // 5 requests per user/IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// GET /api/generate/test - Simple test endpoint
router.get("/test", (req, res) => {
  console.log("🧪 [TEST] Test endpoint hit");
  res.json({ 
    success: true, 
    message: "Generate route is working",
    timestamp: new Date().toISOString(),
    env: {
      hasGeneratorUrl: !!process.env.GENERATOR_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

// POST /api/generate - Authenticated endpoint (requires credits)
router.post("/", 
  (req, res, next) => {
    try {
      console.log("🔍 [ROUTE] Starting /api/generate request");
      console.log("🔍 [ROUTE] Headers:", Object.keys(req.headers));
      console.log("🔍 [ROUTE] Body keys:", Object.keys(req.body || {}));
      next();
    } catch (err) {
      console.error("❌ [ROUTE] Error in route handler:", err);
      next(err);
    }
  },
  requireAuth, 
  (req, res, next) => {
    try {
      console.log("✅ [AUTH] Authentication passed, user:", req.user?.id);
      next();
    } catch (err) {
      console.error("❌ [AUTH] Error after auth:", err);
      next(err);
    }
  },
  generateLimiter, 
  (req, res, next) => {
    try {
      console.log("✅ [RATE_LIMIT] Rate limit passed");
      next();
    } catch (err) {
      console.error("❌ [RATE_LIMIT] Error after rate limit:", err);
      next(err);
    }
  },
  validateRequest(generateEmailSchema), 
  (req, res, next) => {
    try {
      console.log("✅ [VALIDATION] Request validation passed");
      next();
    } catch (err) {
      console.error("❌ [VALIDATION] Error after validation:", err);
      next(err);
    }
  },
  maybeConsumeImageCredit, 
  (req, res, next) => {
    try {
      console.log("✅ [IMAGE_CREDITS] Image credit check passed");
      next();
    } catch (err) {
      console.error("❌ [IMAGE_CREDITS] Error after image credits:", err);
      next(err);
    }
  },
  requireEmailCredit, 
  (req, res, next) => {
    try {
      console.log("✅ [EMAIL_CREDITS] Email credit check passed");
      next();
    } catch (err) {
      console.error("❌ [EMAIL_CREDITS] Error after email credits:", err);
      next(err);
    }
  },
  (req, res, next) => {
    try {
      console.log("🎯 [CONTROLLER] About to call generate Emails controller");
      next();
    } catch (err) {
      console.error("❌ [CONTROLLER] Error before controller:", err);
      next(err);
    }
  },
  generateEmailsController,
);

// POST /api/generate/preview - Anonymous endpoint (preview only, no credits required)
router.post("/preview", 
  (req, res, next) => {
    try {
      console.log("🔍 [ROUTE] Starting /api/generate/preview request");
      console.log("🔍 [ROUTE] Headers:", Object.keys(req.headers));
      console.log("🔍 [ROUTE] Body keys:", Object.keys(req.body || {}));
      next();
    } catch (err) {
      console.error("❌ [ROUTE] Error in route handler:", err);
      next(err);
    }
  },
  checkTrialUsage, // Check if IP has already used free trial
  generateLimiter, 
  (req, res, next) => {
    try {
      console.log("✅ [RATE_LIMIT] Rate limit passed");
      next();
    } catch (err) {
      console.error("❌ [RATE_LIMIT] Error after rate limit:", err);
      next(err);
    }
  },
  validateRequest(generateEmailSchema), 
  (req, res, next) => {
    try {
      console.log("✅ [VALIDATION] Request validation passed");
      next();
    } catch (err) {
      console.error("❌ [VALIDATION] Error after validation:", err);
      next(err);
    }
  },
  (req, res, next) => {
    try {
      console.log("🎯 [CONTROLLER] About to call generate Emails controller (preview mode)");
      // Mark this as preview mode for the controller
      req.isPreviewMode = true;
      next();
    } catch (err) {
      console.error("❌ [CONTROLLER] Error before controller:", err);
      next(err);
    }
  },
  generateEmailsController,
  markTrialUsed // Mark IP as having used free trial after successful generation
);

export default router;
