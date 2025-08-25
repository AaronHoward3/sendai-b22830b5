import dotenv from "dotenv";
import app from "./app.js";

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3000;

// Health check
app.get('/healthz', (_req, res) => res.type('text').send('ok'));


app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
}); 