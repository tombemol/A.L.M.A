import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createUserSchema,
  replaceUserRolesSchema,
  setUserStatusSchema,
  userIdParamSchema,
} from "./users.schemas.js";
import {
  createUser,
  listUsers,
  replaceUserRoles,
  setUserActive,
} from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/",
  requirePermission(PERMISSIONS.USERS_READ),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ users: await listUsers() });
  }),
);

usersRouter.post(
  "/",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await createUser(input);
    res.status(201).json({ user });
  }),
);

usersRouter.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = userIdParamSchema.parse(req.params);
    const input = setUserStatusSchema.parse(req.body);
    const user = await setUserActive(id, input.active);
    res.status(200).json({ user });
  }),
);

usersRouter.put(
  "/:id/roles",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = userIdParamSchema.parse(req.params);
    const input = replaceUserRolesSchema.parse(req.body);
    const user = await replaceUserRoles(id, input.roleCodes);
    res.status(200).json({ user });
  }),
);
