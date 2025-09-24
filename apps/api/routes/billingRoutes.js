// apps/api/routes/billingRoutes.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createCheckoutSession,
  createPortalSession,
  upgradeSubscription,
  cancelSubscription,
} from "../controllers/billingController.js";

const router = Router();

// Copies query params into req.body so controllers keep the same shape
function normalizeBodyFromQuery(req, _res, next) {
  if (!req.body || typeof req.body !== "object") req.body = {};
  for (const [k, v] of Object.entries(req.query || {})) {
    if (req.body[k] === undefined) req.body[k] = v;
  }
  next();
}

// --- Checkout ---
router.post("/checkout", requireAuth, createCheckoutSession);
// Optional GET shim (lets you hit /api/billing/checkout?planId=...)
router.get("/checkout", requireAuth, normalizeBodyFromQuery, createCheckoutSession);

// --- Customer Portal ---
router.post("/portal", requireAuth, createPortalSession);
// Optional GET shim
router.get("/portal", requireAuth, normalizeBodyFromQuery, createPortalSession);

// --- Subscription Management ---
router.post("/upgrade", requireAuth, upgradeSubscription);
router.post("/cancel", requireAuth, cancelSubscription);

export default router;
