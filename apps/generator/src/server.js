import dotenv from "dotenv";
import app from "./app.js"; // your existing Express app

dotenv.config();

const port = process.env.PORT || 3000;

// Health endpoint (Render + manual probes)
app.get("/healthz", (_req, res) => res.type("text").send("ok"));
app.head("/healthz", (_req, res) => res.status(200).end());

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
