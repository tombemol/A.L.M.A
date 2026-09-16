import cookieParser from "cookie-parser";
import express from "express";
import { PERMISSIONS } from "@alma/shared";
import { errorHandler } from "./http/error-handler.js";
import { attachAuthUser } from "./http/request-context.js";
import {
  requireAuth,
  requirePermission,
} from "./http/require-auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/auth/users.routes.js";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachAuthUser);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.get(
  "/api/internal/admin-check",
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  (_req, res) => res.sendStatus(204),
);

app.use(errorHandler);
