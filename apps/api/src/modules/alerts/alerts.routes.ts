import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  alertListQuerySchema,
  productIdParamSchema,
  reorderPolicySchema,
} from "./alerts.schemas.js";
import {
  evaluateAlerts,
  getReorderPolicy,
  listAlerts,
  upsertReorderPolicy,
} from "./alerts.service.js";

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

alertsRouter.get(
  "/",
  requirePermission(PERMISSIONS.ALERTS_READ),
  asyncHandler(async (req, res) => {
    const query = alertListQuerySchema.parse(req.query);
    res.status(200).json(await listAlerts(query));
  }),
);

alertsRouter.post(
  "/evaluate",
  requirePermission(PERMISSIONS.ALERTS_MANAGE),
  asyncHandler(async (req, res) => {
    const result = await evaluateAlerts({ actorUserId: req.authUser!.id });
    res.status(200).json(result);
  }),
);

alertsRouter.get(
  "/policies/:productId",
  requirePermission(PERMISSIONS.ALERTS_READ),
  asyncHandler(async (req, res) => {
    const { productId } = productIdParamSchema.parse(req.params);
    res.status(200).json({ policy: await getReorderPolicy(productId) });
  }),
);

alertsRouter.put(
  "/policies/:productId",
  requirePermission(PERMISSIONS.ALERTS_MANAGE),
  asyncHandler(async (req, res) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const input = reorderPolicySchema.parse(req.body);
    const policy = await upsertReorderPolicy(productId, input, req.authUser!.id);
    res.status(200).json({ policy });
  }),
);
