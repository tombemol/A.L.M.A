import type { RequestHandler, Response } from "express";
import { DomainError } from "@alma/shared";
import { env } from "../../config/env.js";
import { revokeSession } from "./auth.session.js";
import {
  adminLoginSchema,
  operatorLoginSchema,
} from "./auth.schemas.js";
import { loginAdmin, loginOperator } from "./auth.service.js";

function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
) {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export const operatorLogin: RequestHandler = async (req, res) => {
  const input = operatorLoginSchema.parse(req.body);
  const result = await loginOperator(input);

  setSessionCookie(res, result.token, result.expiresAt);
  res.status(200).json({ user: result.user });
};

export const adminLogin: RequestHandler = async (req, res) => {
  const input = adminLoginSchema.parse(req.body);
  const result = await loginAdmin(input);

  setSessionCookie(res, result.token, result.expiresAt);
  res.status(200).json({ user: result.user });
};

export const logout: RequestHandler = async (req, res) => {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME];

  if (typeof token === "string" && token.length > 0) {
    await revokeSession(token);
  }

  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  res.sendStatus(204);
};

export const me: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new DomainError(
      "AUTH_REQUIRED",
      401,
      "Autenticação obrigatória",
    );
  }

  res.status(200).json({ user: req.authUser });
};
