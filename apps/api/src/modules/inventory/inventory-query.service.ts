import { prisma } from "@alma/database";
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

export async function listInventoryMovements(query: InventoryMovementsQuery) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(query.type ? { type: query.type } : {}),
      ...(query.productId
        ? { items: { some: { productId: query.productId } } }
        : {}),
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
    take: query.limit,
  });

  return { movements };
}
