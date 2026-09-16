import type { ErrorRequestHandler } from "express";
import { DomainError } from "@alma/shared";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        fields: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno",
    },
  });
};
