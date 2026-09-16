import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import { postInventoryMovement } from "./inventory-ledger.service.js";
import {
  listInventoryBalances,
  listInventoryMovements,
} from "./inventory-query.service.js";
import {
  inventoryBalancesQuerySchema,
  inventoryMovementsQuerySchema,
  postInventoryMovementSchema,
} from "./inventory.schemas.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get(
  "/balances",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (req, res) => {
    const query = inventoryBalancesQuerySchema.parse(req.query);
    res.status(200).json(await listInventoryBalances(query));
  }),
);

inventoryRouter.get(
  "/movements",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (req, res) => {
    const query = inventoryMovementsQuerySchema.parse(req.query);
    res.status(200).json(await listInventoryMovements(query));
  }),
);

inventoryRouter.post(
  "/movements",
  requirePermission(PERMISSIONS.INVENTORY_MOVE),
  asyncHandler(async (req, res) => {
    const input = postInventoryMovementSchema.parse(req.body);
    const result = await postInventoryMovement(req.authUser!.id, input);
    res.status(201).json(result);
  }),
);
