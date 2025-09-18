// apps/api/routes/adminRoutes.js
import express from "express";
import {
  adminListUsers,
  adminSearchUsers,
  adminGetUserSnapshot,
  adminPatchCredits,
  adminResetCreditsToPlan,
  adminPatchAccount,
  adminBanUser,
  adminUnbanUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", adminListUsers);

// Find users by email, id, or brand domain
router.get("/users/search", adminSearchUsers);

// Read a user's full snapshot
router.get("/users/:userId/snapshot", adminGetUserSnapshot);

// Credits
router.patch("/users/:userId/credits", adminPatchCredits);
router.post("/users/:userId/reset-credits", adminResetCreditsToPlan);

// Account (email, display name, is_admin, banned)
router.patch("/users/:userId/account", adminPatchAccount);

// Ban / Unban
router.post("/users/:userId/ban", adminBanUser);
router.post("/users/:userId/unban", adminUnbanUser);

export default router;
