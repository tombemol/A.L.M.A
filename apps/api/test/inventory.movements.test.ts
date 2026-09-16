import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";

async function resetInventoryTables() {
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
}

describe("transferências e ajustes de estoque", () => {
  let productId: string;
  let fromLocationId: string;
  let toLocationId: string;

  beforeEach(async () => {
    await resetInventoryTables();
    await prisma.alert.deleteMany();
    await prisma.reorderPolicy.deleteMany();
    await prisma.productLocation.deleteMany();
    await prisma.storageLocation.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.productUnitConversion.deleteMany();
    await prisma.productIdentifier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unitOfMeasure.deleteMany();

    const category = await prisma.category.create({
      data: { code: "MOV", name: "Movimentação" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "MOV-001",
        name: "Material movimentável",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-MOV", name: "Movimentações" },
    });
    const from = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "A-01-01",
        occupancyMode: "SHARED",
      },
    });
    const to = await prisma.storageLocation.create({
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
          locationId: from.id,
          isPrimary: true,
        },
        {
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: to.id,
          isPrimary: false,
        },
      ],
    });

    productId = product.id;
    fromLocationId = from.id;
    toLocationId = to.id;
  });

  afterEach(resetInventoryTables);

  it("reverte a transferência inteira quando a origem não possui saldo", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: fromLocationId,
      quantity: "2",
      unitCost: "10",
    });

    await expect(
      postInventoryMovement(null, {
        type: "TRANSFER",
        productId,
        fromLocationId,
        toLocationId,
        quantity: "3",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "INSUFFICIENT_STOCK",
        status: 409,
      }),
    );

    const fromBalance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId: fromLocationId,
          stockKey: "NONE",
        },
      },
    });
    const toBalance = await prisma.inventoryBalance.findUnique({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId: toLocationId,
          stockKey: "NONE",
        },
      },
    });
    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });

    expect(fromBalance.quantity.toString()).toBe("2");
    expect(toBalance).toBeNull();
    expect(valuation.quantity.toString()).toBe("2");
    expect(await prisma.stockMovement.count()).toBe(1);
  });

  it("rejeita transferência com origem e destino iguais", async () => {
    await expect(
      postInventoryMovement(null, {
        type: "TRANSFER",
        productId,
        fromLocationId,
        toLocationId: fromLocationId,
        quantity: "1",
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it("exige justificativa em ajustes e ganhos/perdas de inventário", async () => {
    for (const type of [
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT",
      "INVENTORY_GAIN",
      "INVENTORY_LOSS",
    ] as const) {
      await expect(
        postInventoryMovement(null, {
          type,
          productId,
          ...(type.endsWith("IN") || type === "INVENTORY_GAIN"
            ? { toLocationId: fromLocationId }
            : { fromLocationId }),
          quantity: "1",
        }),
      ).rejects.toMatchObject({ name: "ZodError" });
    }
  });

  it("usa o custo médio vigente em ajuste de entrada sem custo explícito", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId,
      toLocationId: fromLocationId,
      quantity: "4",
      unitCost: "8",
    });

    const result = await postInventoryMovement(null, {
      type: "ADJUSTMENT_IN",
      productId,
      toLocationId: fromLocationId,
      quantity: "1",
      reason: "Diferença encontrada na contagem física",
    });

    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });

    expect(result.movement.items[0]?.unitCost?.toString()).toBe("8");
    expect(valuation.quantity.toString()).toBe("5");
    expect(valuation.averageUnitCost.toString()).toBe("8");
    expect(valuation.totalValue.toString()).toBe("40");
  });
});
