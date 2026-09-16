import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";

async function resetInventoryTables() {
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
}

describe("custo médio móvel do estoque", () => {
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
      data: { code: "ELE", name: "Elétrica" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "CONT-32A",
        name: "Contator 32 A",
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
        code: "B-02-03",
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

  it("calcula custo médio ponderado e valor estimado", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "10",
      unitCost: "10",
    });
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "10",
      unitCost: "20",
    });

    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });
    const items = await prisma.stockMovementItem.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });

    expect(valuation.quantity.toString()).toBe("20");
    expect(valuation.averageUnitCost.toString()).toBe("15");
    expect(valuation.totalValue.toString()).toBe("300");
    expect(items.map((item) => item.unitCost?.toString())).toEqual(["10", "20"]);
    expect(items.map((item) => item.totalCost?.toString())).toEqual(["100", "200"]);
  });

  it("aceita custo zero e rejeita custo negativo", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: locationId,
      quantity: "2",
      unitCost: "0",
    });

    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });
    expect(valuation.averageUnitCost.toString()).toBe("0");
    expect(valuation.totalValue.toString()).toBe("0");

    await expect(
      postInventoryMovement(null, {
        type: "ENTRY",
        productId,
        toLocationId: locationId,
        quantity: "1",
        unitCost: "-0.01",
      }),
    ).rejects.toBeDefined();

    expect(await prisma.stockMovement.count()).toBe(1);
  });
});
