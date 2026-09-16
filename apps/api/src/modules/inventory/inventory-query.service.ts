import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import type {
  InventoryBalancesQuery,
  InventoryMovementsQuery,
} from "./inventory.schemas.js";

export async function listInventoryBalances(query: InventoryBalancesQuery) {
  const balances = await prisma.inventoryBalance.findMany({
    where: {
      quantity: { gt: 0 },
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.warehouseId
        ? { location: { warehouseId: query.warehouseId } }
        : {}),
      ...(query.lotCode ? { lot: { lotCode: query.lotCode } } : {}),
      ...(query.serialNumber
        ? { serialItem: { serialNumber: query.serialNumber } }
        : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          trackingMode: true,
          baseUnit: {
            select: { id: true, code: true, name: true, symbol: true },
          },
        },
      },
      location: {
        include: {
          warehouse: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      lot: true,
      serialItem: true,
    },
    orderBy: [{ productId: "asc" }, { locationId: "asc" }, { stockKey: "asc" }],
  });

  const valuation = query.productId
    ? await prisma.inventoryValuation.findUnique({
        where: { productId: query.productId },
      })
    : null;

  return { balances, valuation };
}

export async function getInventoryProductSummary(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      sku: true,
      name: true,
      trackingMode: true,
      active: true,
      baseUnit: {
        select: { id: true, code: true, name: true, symbol: true },
      },
    },
  });

  if (!product) {
    throw new DomainError("NOT_FOUND", 404, "Produto não encontrado");
  }

  const [{ balances }, valuation] = await Promise.all([
    listInventoryBalances({ productId }),
    prisma.inventoryValuation.findUnique({ where: { productId } }),
  ]);

  return {
    product,
    quantity: valuation?.quantity ?? "0",
    averageUnitCost: valuation?.averageUnitCost ?? "0",
    totalValue: valuation?.totalValue ?? "0",
    balances,
  };
}

export async function listInventoryMovements(query: InventoryMovementsQuery) {
  const itemFilter = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.lotCode ? { lot: { lotCode: query.lotCode } } : {}),
    ...(query.serialNumber
      ? { serialItem: { serialNumber: query.serialNumber } }
      : {}),
  };
  const hasItemFilter = Object.keys(itemFilter).length > 0;

  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(query.type ? { type: query.type } : {}),
      ...(hasItemFilter ? { items: { some: itemFilter } } : {}),
    },
    include: {
      performedBy: {
        select: {
          id: true,
          employeeCode: true,
          username: true,
          displayName: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              trackingMode: true,
            },
          },
          fromLocation: {
            select: { id: true, code: true, name: true },
          },
          toLocation: {
            select: { id: true, code: true, name: true },
          },
          lot: true,
          serialItem: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  return {
    movements,
    pagination: {
      page: query.page,
      limit: query.limit,
    },
  };
}
