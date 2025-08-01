import express from "express";
import cors from "cors";
import brandRoutes from "./routes/brandRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import generateRoutes from "./routes/generateRoutes.js";

import dotenv from "dotenv";
dotenv.config();
console.log("dotenv loaded keys:", Object.keys(process.env));
console.log("BRANDDEV_API_KEY:", process.env.BRANDDEV_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


// register routes
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/generate", generateRoutes);

app.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
});