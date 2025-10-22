// apps/api/routes/generateRoutes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireEmailCredit } from "../middleware/credits.js";
import { generateEmailsController, testController } from "../controllers/generateController.js";
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

// GET /api/generate/service-test - Test service communication
router.get("/service-test", testController);

// GET /api/generate/trial-status - Check trial status without consuming it
router.get("/trial-status", checkTrialUsage, (req, res) => {
  // If we get here, the trial hasn't been used yet (checkTrialUsage would have blocked it)
  res.json({ 
    success: true, 
    trialUsed: false,
    message: "Trial available",
    ip: req.trialInfo?.ip
  });
});

// POST /api/generate - Authenticated endpoint (requires credits)
router.post("/", 
  requireAuth, 
  generateLimiter, 
  validateRequest(generateEmailSchema), 
  maybeConsumeImageCredit, 
  requireEmailCredit, 
  generateEmailsController,
);

// POST /api/generate/preview - Anonymous endpoint (preview only, no credits required)
router.post("/preview", 
  checkTrialUsage, // Check if IP has already used free trial
  generateLimiter, 
  validateRequest(generateEmailSchema), 
  (req, res, next) => {
    // Mark this as preview mode for the controller
    req.isPreviewMode = true;
    next();
  },
  generateEmailsController,
  markTrialUsed // Mark IP as having used free trial after successful generation
);

export default router;
