// apps/api/routes/billingRoutes.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createCheckoutSession,
  createPortalSession,
} from "../controllers/billingController.js";

const router = Router();

// Authenticated billing endpoints
router.post("/checkout", requireAuth, createCheckoutSession);
router.post("/portal", requireAuth, createPortalSession);

// Export DEFAULT so `import billingRoutes from ...` works
export default router;
