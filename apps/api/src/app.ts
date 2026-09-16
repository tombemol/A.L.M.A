import cookieParser from "cookie-parser";
import express from "express";
import { errorHandler } from "./http/error-handler.js";
import { attachAuthUser } from "./http/request-context.js";
import { authRouter } from "./modules/auth/auth.routes.js";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachAuthUser);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.use(errorHandler);
