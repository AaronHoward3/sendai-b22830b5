import express from "express";
import { generateEmailsFromEmailController } from "../controllers/emailController.js";

const router = express.Router();
// One route supports both JSON and SSE.
// - JSON: normal POST with Accept: application/json
// - SSE : POST with Accept: text/event-stream  (Irios now does this)
router.post("/generate-emails", generateEmailsFromEmailController);

export default router;