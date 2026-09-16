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

describe("valorização de saídas e transferências", () => {
  let productId: string;
  let fromLocationId: string;
  let toLocationId: string;

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
        sku: "ROL-6204-CUSTO",
        name: "Rolamento 6204",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-CUSTO", name: "Principal" },
    });
    const fromLocation = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "A-01-01",
        occupancyMode: "SHARED",
      },
    });
    const toLocation = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "A-01-02",
        occupancyMode: "SHARED",
      },
    });
    await prisma.productLocation.createMany({
      data: [
        {
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: fromLocation.id,
          isPrimary: true,
        },
        {
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: toLocation.id,
          isPrimary: false,
        },
      ],
    });

    productId = product.id;
    fromLocationId = fromLocation.id;
    toLocationId = toLocation.id;
  });

  afterEach(resetInventoryTables);

  it("baixa quantidade e valor pelo custo médio vigente", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: fromLocationId,
      quantity: "10",
      unitCost: "12.5",
    });

    const result = await postInventoryMovement(null, {
      type: "WITHDRAWAL",
      productId,
      fromLocationId,
      quantity: "4",
    });

    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });
    const item = result.movement.items[0];

    expect(valuation.quantity.toString()).toBe("6");
    expect(valuation.averageUnitCost.toString()).toBe("12.5");
    expect(valuation.totalValue.toString()).toBe("75");
    expect(item?.unitCost?.toString()).toBe("12.5");
    expect(item?.totalCost?.toString()).toBe("50");
  });

  it("transfere saldo sem alterar a valorização global", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: fromLocationId,
      quantity: "8",
      unitCost: "9",
    });

    const result = await postInventoryMovement(null, {
      type: "TRANSFER",
      productId,
      fromLocationId,
      toLocationId,
      quantity: "3",
    });

    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });
    const balances = await prisma.inventoryBalance.findMany({
      where: { productId },
      orderBy: { locationId: "asc" },
    });
    const item = result.movement.items[0];

    expect(valuation.quantity.toString()).toBe("8");
    expect(valuation.averageUnitCost.toString()).toBe("9");
    expect(valuation.totalValue.toString()).toBe("72");
    expect(balances.map((balance) => balance.quantity.toString()).sort()).toEqual([
      "3",
      "5",
    ]);
    expect(item?.unitCost?.toString()).toBe("9");
    expect(item?.totalCost?.toString()).toBe("27");
  });
});
