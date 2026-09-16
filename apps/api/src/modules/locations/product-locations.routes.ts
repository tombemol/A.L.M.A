import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  associateProductLocationSchema,
  productLocationAssociationParamSchema,
  productLocationProductParamSchema,
} from "./locations.schemas.js";
import {
  associateProductLocation,
  listProductLocations,
  removeProductLocation,
} from "./product-locations.service.js";

export const productLocationsRouter = Router();

productLocationsRouter.use(requireAuth);

productLocationsRouter.get(
  "/:productId/locations",
  requirePermission(PERMISSIONS.LOCATIONS_READ),
  asyncHandler(async (req, res) => {
    const { productId } = productLocationProductParamSchema.parse(req.params);
    res.status(200).json({
      locations: await listProductLocations(productId),
    });
  }),
);

productLocationsRouter.post(
  "/:productId/locations",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { productId } = productLocationProductParamSchema.parse(req.params);
    const input = associateProductLocationSchema.parse(req.body);
    res.status(201).json({
      location: await associateProductLocation(productId, input),
    });
  }),
);

productLocationsRouter.delete(
  "/:productId/locations/:associationId",
  requirePermission(PERMISSIONS.LOCATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { productId, associationId } =
      productLocationAssociationParamSchema.parse(req.params);
    await removeProductLocation(productId, associationId);
    res.sendStatus(204);
  }),
);
