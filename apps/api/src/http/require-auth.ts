import type { RequestHandler } from "express";
import { DomainError, type PermissionCode } from "@alma/shared";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.authUser) {
    next(
      new DomainError(
        "AUTH_REQUIRED",
        401,
        "Autenticação obrigatória",
      ),
    );
    return;
  }

  next();
};

export function requirePermission(
  permission: PermissionCode,
): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(
        new DomainError(
          "AUTH_REQUIRED",
          401,
          "Autenticação obrigatória",
        ),
      );
      return;
    }

    if (!req.authUser.permissions.includes(permission)) {
      next(
        new DomainError(
          "PERMISSION_DENIED",
          403,
          "Permissão insuficiente",
          { permission },
        ),
      );
      return;
    }

    next();
  };
}
