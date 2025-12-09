// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import challengesRouter from "./routes/challenges";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: [
    // 'http://localhost:3000',
    'http://localhost:8080',
    'https://conceptvella.vercel.app',
    'https://www.conceptvella.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/challenges", challengesRouter);
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});