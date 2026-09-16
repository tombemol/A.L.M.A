import { Router } from "express";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import { writeAuditLog } from "../audit/audit.service.js";
import {
  createWithdrawalRequestSchema,
  directWithdrawalSchema,
  fulfillWithdrawalRequestSchema,
  withdrawalDecisionSchema,
  withdrawalListQuerySchema,
  withdrawalRequestIdParamSchema,
} from "./withdrawals.schemas.js";
import {
  approveWithdrawalRequest,
  createDirectWithdrawal,
  createWithdrawalRequest,
  fulfillWithdrawalRequest,
  getWithdrawalRequest,
  listWithdrawalRequests,
  rejectWithdrawalRequest,
} from "./withdrawals.service.js";

export const withdrawalRequestsRouter = Router();
export const withdrawalsRouter = Router();

withdrawalRequestsRouter.use(requireAuth);
withdrawalsRouter.use(requireAuth);

async function auditWithdrawalOnce(input: {
  actorUserId: string;
  action: string;
  requestId: string;
  after?: Record<string, unknown>;
}) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: input.action,
      entityType: "WithdrawalRequest",
      entityId: input.requestId,
    },
    select: { id: true },
  });
  if (existing) return;

  await writeAuditLog(prisma, {
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: "WithdrawalRequest",
    entityId: input.requestId,
    after: input.after,
  });
}

withdrawalRequestsRouter.get(
  "/",
  requirePermission(PERMISSIONS.WITHDRAWALS_READ),
  asyncHandler(async (req, res) => {
    const query = withdrawalListQuerySchema.parse(req.query);
    res.status(200).json(await listWithdrawalRequests(query));
  }),
);

withdrawalRequestsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.WITHDRAWALS_READ),
  asyncHandler(async (req, res) => {
    const { id } = withdrawalRequestIdParamSchema.parse(req.params);
    res.status(200).json({ request: await getWithdrawalRequest(id) });
  }),
);

withdrawalRequestsRouter.post(
  "/",
  requirePermission(PERMISSIONS.WITHDRAWALS_REQUEST),
  asyncHandler(async (req, res) => {
    const input = createWithdrawalRequestSchema.parse(req.body);
    const withdrawalRequest = await createWithdrawalRequest(
      req.authUser!.id,
      input,
    );
    await auditWithdrawalOnce({
      actorUserId: req.authUser!.id,
      action: "WITHDRAWAL_REQUESTED",
      requestId: withdrawalRequest.id,
      after: {
        productId: input.productId,
        quantity: input.quantity,
        departmentId: input.departmentId,
        equipmentId: input.equipmentId ?? null,
        workOrderId: input.workOrderId ?? null,
        fromLocationId: input.fromLocationId ?? null,
        requiresApproval: withdrawalRequest.requiresApprovalSnapshot,
        status: withdrawalRequest.status,
      },
    });
    res.status(201).json({ request: withdrawalRequest });
  }),
);

withdrawalRequestsRouter.post(
  "/:id/approve",
  requirePermission(PERMISSIONS.WITHDRAWALS_APPROVE),
  asyncHandler(async (req, res) => {
    const { id } = withdrawalRequestIdParamSchema.parse(req.params);
    const { comment } = withdrawalDecisionSchema.parse(req.body ?? {});
    const withdrawalRequest = await approveWithdrawalRequest(
      req.authUser!.id,
      id,
      comment,
    );
    await auditWithdrawalOnce({
      actorUserId: req.authUser!.id,
      action: "WITHDRAWAL_APPROVED",
      requestId: id,
      after: { status: withdrawalRequest.status, comment: comment ?? null },
    });
    res.status(200).json({ request: withdrawalRequest });
  }),
);

withdrawalRequestsRouter.post(
  "/:id/reject",
  requirePermission(PERMISSIONS.WITHDRAWALS_APPROVE),
  asyncHandler(async (req, res) => {
    const { id } = withdrawalRequestIdParamSchema.parse(req.params);
    const { comment } = withdrawalDecisionSchema.parse(req.body ?? {});
    const withdrawalRequest = await rejectWithdrawalRequest(
      req.authUser!.id,
      id,
      comment,
    );
    await auditWithdrawalOnce({
      actorUserId: req.authUser!.id,
      action: "WITHDRAWAL_REJECTED",
      requestId: id,
      after: { status: withdrawalRequest.status, comment: comment ?? null },
    });
    res.status(200).json({ request: withdrawalRequest });
  }),
);

withdrawalRequestsRouter.post(
  "/:id/fulfill",
  requirePermission(PERMISSIONS.WITHDRAWALS_FULFILL),
  asyncHandler(async (req, res) => {
    const { id } = withdrawalRequestIdParamSchema.parse(req.params);
    const input = fulfillWithdrawalRequestSchema.parse(req.body);
    const result = await fulfillWithdrawalRequest(req.authUser!.id, id, input);
    await auditWithdrawalOnce({
      actorUserId: req.authUser!.id,
      action: "WITHDRAWAL_FULFILLED",
      requestId: id,
      after: {
        status: result.request.status,
        stockMovementId: result.movement.id,
        fromLocationId: input.fromLocationId,
      },
    });
    res.status(200).json(result);
  }),
);

withdrawalsRouter.post(
  "/direct",
  requirePermission(PERMISSIONS.WITHDRAWALS_FULFILL),
  asyncHandler(async (req, res) => {
    const input = directWithdrawalSchema.parse(req.body);
    const result = await createDirectWithdrawal(req.authUser!.id, input);
    await auditWithdrawalOnce({
      actorUserId: req.authUser!.id,
      action: "WITHDRAWAL_DIRECT",
      requestId: result.request.id,
      after: {
        status: result.request.status,
        productId: input.productId,
        quantity: input.quantity,
        departmentId: input.departmentId,
        fromLocationId: input.fromLocationId,
        stockMovementId: result.movement.id,
      },
    });
    res.status(201).json(result);
  }),
);
