import { Router } from "express";
import { listMyImagesByDomain } from "../controllers/imagesController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// GET /api/images?domain=example.com - Authenticated endpoint
router.get("/images", requireAuth, listMyImagesByDomain);

// GET /api/images/preview?domain=example.com - Anonymous endpoint (returns empty array)
router.get("/images/preview", (req, res) => {
  // For anonymous users, return empty images array
  res.json({ images: [] });
});

export default router;
