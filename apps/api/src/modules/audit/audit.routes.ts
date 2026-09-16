import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import { auditListQuerySchema } from "./audit.schemas.js";
import { listAuditLogs } from "./audit.service.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get(
  "/",
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(async (req, res) => {
    const query = auditListQuerySchema.parse(req.query);
    res.status(200).json(await listAuditLogs(query));
  }),
);
