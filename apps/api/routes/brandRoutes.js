import express from "express";
import { checkBrand, updateBrandColors } from "../controllers/brandController.js";

const router = express.Router();

router.post("/check", checkBrand);
router.patch("/colors", updateBrandColors);

export default router;
