import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createDepartmentSchema,
  createEquipmentSchema,
  createWorkOrderSchema,
  destinationIdParamSchema,
  equipmentListQuerySchema,
  updateDepartmentSchema,
  updateEquipmentSchema,
  updateWorkOrderSchema,
  workOrderListQuerySchema,
} from "./destinations.schemas.js";
import {
  createDepartment,
  createEquipment,
  createWorkOrder,
  listDepartments,
  listEquipment,
  listWorkOrders,
  updateDepartment,
  updateEquipment,
  updateWorkOrder,
} from "./destinations.service.js";

export const destinationsRouter = Router();

destinationsRouter.use(requireAuth);

destinationsRouter.get(
  "/departments",
  requirePermission(PERMISSIONS.DESTINATIONS_READ),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ departments: await listDepartments() });
  }),
);

destinationsRouter.post(
  "/departments",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createDepartmentSchema.parse(req.body);
    res.status(201).json({ department: await createDepartment(input) });
  }),
);

destinationsRouter.patch(
  "/departments/:id",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = destinationIdParamSchema.parse(req.params);
    const input = updateDepartmentSchema.parse(req.body);
    res.status(200).json({ department: await updateDepartment(id, input) });
  }),
);

destinationsRouter.get(
  "/equipment",
  requirePermission(PERMISSIONS.DESTINATIONS_READ),
  asyncHandler(async (req, res) => {
    const query = equipmentListQuerySchema.parse(req.query);
    res.status(200).json({ equipment: await listEquipment(query) });
  }),
);

destinationsRouter.post(
  "/equipment",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createEquipmentSchema.parse(req.body);
    res.status(201).json({ equipment: await createEquipment(input) });
  }),
);

destinationsRouter.patch(
  "/equipment/:id",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = destinationIdParamSchema.parse(req.params);
    const input = updateEquipmentSchema.parse(req.body);
    res.status(200).json({ equipment: await updateEquipment(id, input) });
  }),
);

destinationsRouter.get(
  "/work-orders",
  requirePermission(PERMISSIONS.DESTINATIONS_READ),
  asyncHandler(async (req, res) => {
    const query = workOrderListQuerySchema.parse(req.query);
    res.status(200).json({ workOrders: await listWorkOrders(query) });
  }),
);

destinationsRouter.post(
  "/work-orders",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createWorkOrderSchema.parse(req.body);
    res.status(201).json({ workOrder: await createWorkOrder(input) });
  }),
);

destinationsRouter.patch(
  "/work-orders/:id",
  requirePermission(PERMISSIONS.DESTINATIONS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = destinationIdParamSchema.parse(req.params);
    const input = updateWorkOrderSchema.parse(req.body);
    res.status(200).json({ workOrder: await updateWorkOrder(id, input) });
  }),
);
