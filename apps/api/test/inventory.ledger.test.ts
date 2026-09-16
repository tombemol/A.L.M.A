import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";

async function resetInventoryTables() {
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
}

describe("ledger transacional de estoque", () => {
  let productId: string;
  let locationId: string;

  beforeEach(async () => {
    await resetInventoryTables();
    await prisma.productLocation.deleteMany();
    await prisma.storageLocation.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.productUnitConversion.deleteMany();
    await prisma.productIdentifier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unitOfMeasure.deleteMany();

    const category = await prisma.category.create({
      data: { code: "MEC", name: "Mecânica" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "ROL-6204",
        name: "Rolamento 6204",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-01", name: "Principal" },
    });
    const location = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "A-01-01",
        occupancyMode: "SHARED",
      },
    });
    await prisma.productLocation.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: location.id,
        isPrimary: true,
      },
    });

    productId = product.id;
    locationId = location.id;
  });

  afterEach(resetInventoryTables);

  it("cria e acumula saldo somente por meio de movimentações", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "10",
      unitCost: "10",
      reference: "NF-001",
    });

    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "5",
      unitCost: "12",
      reference: "NF-002",
    });

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId,
          stockKey: "NONE",
        },
      },
    });
    const movements = await prisma.stockMovement.findMany({
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    expect(balance.quantity.toString()).toBe("15");
    expect(movements).toHaveLength(2);
    expect(movements[0]?.items[0]?.quantity.toString()).toBe("10");
    expect(movements[1]?.items[0]?.quantity.toString()).toBe("5");
  });

  it("rejeita saída que produziria estoque negativo sem deixar movimento parcial", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "3",
      unitCost: "8",
    });

    await expect(
      postInventoryMovement(null, {
        type: "ADJUSTMENT_OUT",
        productId,
        fromLocationId: locationId,
        quantity: "4",
        reason: "Correção de contagem",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "INSUFFICIENT_STOCK",
        status: 409,
      }),
    );

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId,
          stockKey: "NONE",
        },
      },
    });
    const movements = await prisma.stockMovement.findMany();

    expect(balance.quantity.toString()).toBe("3");
    expect(movements).toHaveLength(1);
  });
});
