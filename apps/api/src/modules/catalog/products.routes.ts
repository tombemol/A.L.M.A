import { Router } from "express";
import { PERMISSIONS } from "@alma/shared";
import { asyncHandler } from "../../http/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../../http/require-auth.js";
import {
  createProductSchema,
  entityIdParamSchema,
  productIdentifierInputSchema,
  productIdentifierParamSchema,
  productListQuerySchema,
  replaceProductConversionsSchema,
  resolveIdentifierParamSchema,
  updateProductSchema,
} from "./catalog.schemas.js";
import {
  addProductIdentifier,
  createProduct,
  getProduct,
  listProducts,
  removeProductIdentifier,
  replaceProductConversions,
  resolveProduct,
  updateProduct,
} from "./products.service.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  requirePermission(PERMISSIONS.CATALOG_READ),
  asyncHandler(async (req, res) => {
    const query = productListQuerySchema.parse(req.query);
    res.status(200).json({ products: await listProducts(query) });
  }),
);

productsRouter.get(
  "/resolve/:identifier",
  requirePermission(PERMISSIONS.CATALOG_READ),
  asyncHandler(async (req, res) => {
    const { identifier } = resolveIdentifierParamSchema.parse(req.params);
    res.status(200).json({ product: await resolveProduct(identifier) });
  }),
);

productsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.CATALOG_READ),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    res.status(200).json({ product: await getProduct(id) });
  }),
);

productsRouter.post(
  "/",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body);
    res.status(201).json({ product: await createProduct(input) });
  }),
);

productsRouter.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    res.status(200).json({ product: await updateProduct(id, input) });
  }),
);

productsRouter.post(
  "/:id/identifiers",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    const input = productIdentifierInputSchema.parse(req.body);
    res.status(201).json({ identifier: await addProductIdentifier(id, input) });
  }),
);

productsRouter.delete(
  "/:id/identifiers/:identifierId",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id, identifierId } = productIdentifierParamSchema.parse(req.params);
    await removeProductIdentifier(id, identifierId);
    res.sendStatus(204);
  }),
);

productsRouter.put(
  "/:id/conversions",
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const { id } = entityIdParamSchema.parse(req.params);
    const input = replaceProductConversionsSchema.parse(req.body);
    res.status(200).json({ product: await replaceProductConversions(id, input) });
  }),
);
