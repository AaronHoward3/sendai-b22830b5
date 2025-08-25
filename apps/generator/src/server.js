import dotenv from "dotenv";
import app from "./app.js";

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3000;

app.get('/healthz', (req, res) => {
  res.send('ok');
});


app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
}); 