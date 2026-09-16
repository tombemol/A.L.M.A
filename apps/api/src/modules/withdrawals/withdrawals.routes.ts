import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
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
    res.status(200).json({ request: withdrawalRequest });
  }),
);

withdrawalRequestsRouter.post(
  "/:id/fulfill",
  requirePermission(PERMISSIONS.WITHDRAWALS_FULFILL),
  asyncHandler(async (req, res) => {
    const { id } = withdrawalRequestIdParamSchema.parse(req.params);
    const input = fulfillWithdrawalRequestSchema.parse(req.body);
    res.status(200).json(
      await fulfillWithdrawalRequest(req.authUser!.id, id, input),
    );
  }),
);

withdrawalsRouter.post(
  "/direct",
  requirePermission(PERMISSIONS.WITHDRAWALS_FULFILL),
  asyncHandler(async (req, res) => {
    const input = directWithdrawalSchema.parse(req.body);
    res.status(201).json(await createDirectWithdrawal(req.authUser!.id, input));
  }),
);
