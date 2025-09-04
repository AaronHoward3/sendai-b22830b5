// apps/api/routes/generateRoutes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireEmailCredit } from "../middleware/credits.js";
import { generateEmails } from "../controllers/generateController.js";
import { maybeConsumeImageCredit } from "../middleware/credits.js";
import { validateRequest, generateEmailSchema } from "../middleware/validation.js";
import { requireCSRF, attachCSRFToken } from "../middleware/csrf.js";

const router = Router();

// Per-route limiter to prevent abuse & satisfy CodeQL alert
const generateLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  max: 5,                    // 5 requests per user/IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// POST /api/generate
router.post("/", requireAuth, generateLimiter, attachCSRFToken, requireCSRF, validateRequest(generateEmailSchema), maybeConsumeImageCredit, requireEmailCredit, generateEmails);

export default router;
