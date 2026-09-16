import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createCategorySchema,
  entityIdParamSchema,
  updateCategorySchema,
} from "./catalog.schemas.js";
import {
  createCategory,
  listCategories,
  updateCategory,
} from "./categories.service.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  requirePermission(PERMISSIONS.CATALOG_READ),
  asyncHandler(async (_req, res) => {
    res.status(200).json({ categories: await listCategories() });
  }),
);

categoriesRouter.post(
  "/",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    res.status(201).json({ category: await createCategory(input) });
  }),
);

categoriesRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    res.status(200).json({ category: await updateCategory(id, input) });
  }),
);
