import express from "express";
import { scrapeProducts, testScraper } from "../controllers/productController.js";

const router = express.Router();

router.post("/scrape", scrapeProducts);
router.post("/test", testScraper);

export default router;
