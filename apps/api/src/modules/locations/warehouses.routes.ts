import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createWarehouseSchema,
  locationIdParamSchema,
  updateWarehouseSchema,
} from "./locations.schemas.js";
import {
  createWarehouse,
  listWarehouses,
  updateWarehouse,
} from "./warehouses.service.js";

export const warehousesRouter = Router();

warehousesRouter.use(requireAuth);

warehousesRouter.get(
  "/",
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ warehouses: await listWarehouses() });
  }),
);

warehousesRouter.post(
  "/",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createWarehouseSchema.parse(req.body);
    res.status(201).json({ warehouse: await createWarehouse(input) });
  }),
);

warehousesRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = locationIdParamSchema.parse(req.params);
    const input = updateWarehouseSchema.parse(req.body);
    res.status(200).json({ warehouse: await updateWarehouse(id, input) });
  }),
);
