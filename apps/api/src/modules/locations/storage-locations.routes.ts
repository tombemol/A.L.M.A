import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createStorageLocationSchema,
  locationIdParamSchema,
  updateStorageLocationSchema,
  warehouseIdParamSchema,
} from "./locations.schemas.js";
import {
  createStorageLocation,
  listStorageLocations,
  updateStorageLocation,
} from "./storage-locations.service.js";

export const warehouseLocationsRouter = Router();
export const storageLocationsRouter = Router();

warehouseLocationsRouter.use(requireAuth);
storageLocationsRouter.use(requireAuth);

warehouseLocationsRouter.get(
  "/:warehouseId/locations",
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  asyncHandler(async (req, res) => {
    const { warehouseId } = warehouseIdParamSchema.parse(req.params);
    res.status(200).json({
      locations: await listStorageLocations(warehouseId),
    });
  }),
);

warehouseLocationsRouter.post(
  "/:warehouseId/locations",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { warehouseId } = warehouseIdParamSchema.parse(req.params);
    const input = createStorageLocationSchema.parse(req.body);
    res.status(201).json({
      location: await createStorageLocation(warehouseId, input),
    });
  }),
);

storageLocationsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = locationIdParamSchema.parse(req.params);
    const input = updateStorageLocationSchema.parse(req.body);
    res.status(200).json({
      location: await updateStorageLocation(id, input),
    });
  }),
);
