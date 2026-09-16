import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { resolveSession } from "../modules/auth/auth.session.js";
import type { SessionUser } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: SessionUser | null;
    }
  }
}

export const attachAuthUser: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME];

  if (typeof token === "string" && token.length > 0) {
    req.authUser = await resolveSession(token);
  } else {
    req.authUser = null;
  }

  next();
};
