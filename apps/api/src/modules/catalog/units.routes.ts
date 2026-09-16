import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createUnitSchema,
  entityIdParamSchema,
  updateUnitSchema,
} from "./catalog.schemas.js";
import { createUnit, listUnits, updateUnit } from "./units.service.js";

export const unitsRouter = Router();

unitsRouter.use(requireAuth);

unitsRouter.get(
  "/",
  requirePermission(PERMISSIONS.CATALOG_READ),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ units: await listUnits() });
  }),
);

unitsRouter.post(
  "/",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createUnitSchema.parse(req.body);
    res.status(201).json({ unit: await createUnit(input) });
  }),
);

unitsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    const input = updateUnitSchema.parse(req.body);
    res.status(200).json({ unit: await updateUnit(id, input) });
  }),
);
