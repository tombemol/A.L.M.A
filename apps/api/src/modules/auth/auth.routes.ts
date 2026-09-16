import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
  adminLogin,
  logout,
  me,
  operatorLogin,
} from "./auth.controller.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post(
  "/operator/login",
  loginLimiter,
  asyncHandler(operatorLogin),
);
authRouter.post(
  "/admin/login",
  loginLimiter,
  asyncHandler(adminLogin),
);
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", asyncHandler(me));
