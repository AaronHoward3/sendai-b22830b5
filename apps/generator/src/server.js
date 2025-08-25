import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const port = process.env.PORT || 3000;

// ✅ Health check (for Render + manual probes)
app.get("/healthz", (_req, res) => res.type("text").send("ok"));

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
