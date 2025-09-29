import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { generateAIContext } from "../controllers/contextController.js";

const router = Router();

// Rate limiting for context generation
const contextLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  max: 10,                    // 10 requests per user/IP per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// POST /api/context/generate - Generate AI-powered context
router.post("/generate", 
  requireAuth,
  contextLimiter,
  generateAIContext
);

export default router;
