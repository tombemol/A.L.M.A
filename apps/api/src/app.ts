import cookieParser from "cookie-parser";
import express from "express";
import { PERMISSIONS } from "@alma/shared";
import { errorHandler } from "./http/error-handler.js";
import { attachAuthUser } from "./http/request-context.js";
import {
  requireAuth,
  requirePermission,
} from "./http/require-auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/auth/users.routes.js";
import { categoriesRouter } from "./modules/catalog/categories.routes.js";
import { productsRouter } from "./modules/catalog/products.routes.js";
import { unitsRouter } from "./modules/catalog/units.routes.js";
import { destinationsRouter } from "./modules/destinations/destinations.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { productLocationsRouter } from "./modules/locations/product-locations.routes.js";
import {
  storageLocationsRouter,
  warehouseLocationsRouter,
} from "./modules/locations/storage-locations.routes.js";
import { warehousesRouter } from "./modules/locations/warehouses.routes.js";
import {
  withdrawalRequestsRouter,
  withdrawalsRouter,
} from "./modules/withdrawals/withdrawals.routes.js";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachAuthUser);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.use("/api/categories", categoriesRouter);
app.use("/api/units", unitsRouter);
app.use("/api/products", productsRouter);
app.use("/api/products", productLocationsRouter);
app.use("/api/warehouses", warehousesRouter);
app.use("/api/warehouses", warehouseLocationsRouter);
app.use("/api/locations", storageLocationsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/destinations", destinationsRouter);
app.use("/api/withdrawal-requests", withdrawalRequestsRouter);
app.use("/api/withdrawals", withdrawalsRouter);

app.get(
  "/api/internal/admin-check",
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  (_req, res) => res.sendStatus(204),
);

app.use(errorHandler);
