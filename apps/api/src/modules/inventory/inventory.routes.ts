import { Router } from "express";
import { prisma } from "@alma/database";
import { DomainError, PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { postInventoryMovement } from "./inventory-ledger.service.js";
import {
  getInventoryProductSummary,
  listInventoryBalances,
  listInventoryMovements,
} from "./inventory-query.service.js";
import {
  adjustmentMovementTypeSchema,
  inventoryBalancesQuerySchema,
  inventoryMovementsQuerySchema,
  postInventoryMovementSchema,
  type ParsedInventoryMovementInput,
} from "./inventory.schemas.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

function auditAction(type: ParsedInventoryMovementInput["type"]) {
  if (type === "ENTRY") return "INVENTORY_ENTRY";
  if (type === "TRANSFER") return "INVENTORY_TRANSFER";
  if (
    type === "ADJUSTMENT_IN" ||
    type === "ADJUSTMENT_OUT" ||
    type === "INVENTORY_GAIN" ||
    type === "INVENTORY_LOSS"
  ) {
    return "INVENTORY_ADJUSTMENT";
  }
  if (type === "RETURN") return "INVENTORY_RETURN";
  return "INVENTORY_MOVEMENT";
}

async function auditMovement(
  actorUserId: string,
  input: ParsedInventoryMovementInput,
  movementId: string,
) {
  await writeAuditLog(prisma, {
    actorUserId,
    action: auditAction(input.type),
    entityType: "StockMovement",
    entityId: movementId,
    after: {
      type: input.type,
      productId: input.productId,
      quantity: input.quantity,
      fromLocationId: input.fromLocationId ?? null,
      toLocationId: input.toLocationId ?? null,
      reason: input.reason ?? null,
      reference: input.reference ?? null,
    },
  });
}

inventoryRouter.get(
  "/balances",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (req, res) => {
    const query = inventoryBalancesQuerySchema.parse(req.query);
    res.status(200).json(await listInventoryBalances(query));
  }),
);

inventoryRouter.get(
  "/products/:productId/summary",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    if (typeof productId !== "string" || productId.length === 0) {
      throw new DomainError("VALIDATION_ERROR", 400, "Produto é obrigatório");
    }
    res.status(200).json(await getInventoryProductSummary(productId));
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
  "/entries",
  requirePermission(PERMISSIONS.INVENTORY_MOVE),
  asyncHandler(async (req, res) => {
    const input = postInventoryMovementSchema.parse({
      ...req.body,
      type: "ENTRY",
    });
    const result = await postInventoryMovement(req.authUser!.id, input);
    await auditMovement(req.authUser!.id, input, result.movement.id);
    res.status(201).json(result);
  }),
);

inventoryRouter.post(
  "/transfers",
  requirePermission(PERMISSIONS.INVENTORY_MOVE),
  asyncHandler(async (req, res) => {
    const input = postInventoryMovementSchema.parse({
      ...req.body,
      type: "TRANSFER",
    });
    const result = await postInventoryMovement(req.authUser!.id, input);
    await auditMovement(req.authUser!.id, input, result.movement.id);
    res.status(201).json(result);
  }),
);

inventoryRouter.post(
  "/adjustments",
  requirePermission(PERMISSIONS.INVENTORY_MOVE),
  asyncHandler(async (req, res) => {
    const type = adjustmentMovementTypeSchema.parse(req.body?.type);
    const input = postInventoryMovementSchema.parse({
      ...req.body,
      type,
    });
    const result = await postInventoryMovement(req.authUser!.id, input);
    await auditMovement(req.authUser!.id, input, result.movement.id);
    res.status(201).json(result);
  }),
);

inventoryRouter.post(
  "/movements",
  requirePermission(PERMISSIONS.INVENTORY_MOVE),
  asyncHandler(async (req, res) => {
    if (req.body?.type === "WITHDRAWAL") {
      throw new DomainError(
        "WITHDRAWAL_REQUEST_REQUIRED",
        409,
        "Retiradas devem usar o fluxo de solicitações ou a retirada direta controlada",
      );
    }
    const input = postInventoryMovementSchema.parse(req.body);
    const result = await postInventoryMovement(req.authUser!.id, input);
    await auditMovement(req.authUser!.id, input, result.movement.id);
    res.status(201).json(result);
  }),
);
