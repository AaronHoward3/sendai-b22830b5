import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getMyCredits, consumeCredits, claimBrand } from "../controllers/creditsController.js";

const router = Router();

router.get("/credits/me", requireAuth, getMyCredits);
router.post("/credits/consume", requireAuth, consumeCredits);
router.post("/credits/claim-brand", requireAuth, claimBrand);

export default router;
