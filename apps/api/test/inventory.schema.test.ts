import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";

describe("persistência da Fase 1C", () => {
  let productId: string;
  let locationId: string;

  beforeEach(async () => {
    await prisma.stockMovementItem.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.inventoryBalance.deleteMany();
    await prisma.inventoryValuation.deleteMany();
    await prisma.serialItem.deleteMany();
    await prisma.inventoryLot.deleteMany();
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
        trackingMode: "LOT",
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

  it("persiste lote, saldo, valorização e item de ledger", async () => {
    const lot = await prisma.inventoryLot.create({
      data: {
        productId,
        lotCode: "L-001",
        expiresAt: new Date("2027-09-16T00:00:00.000Z"),
      },
    });

    const balance = await prisma.inventoryBalance.create({
      data: {
        productId,
        locationId,
        lotId: lot.id,
        stockKey: `LOT:${lot.id}`,
        quantity: "10",
      },
    });

    const valuation = await prisma.inventoryValuation.create({
      data: {
        productId,
        quantity: "10",
        averageUnitCost: "12.5",
        totalValue: "125",
      },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        type: "ENTRY",
        reference: "NF-001",
        items: {
          create: {
            productId,
            toLocationId: locationId,
            lotId: lot.id,
            quantity: "10",
            unitCost: "12.5",
            totalCost: "125",
          },
        },
      },
      include: { items: true },
    });

    expect(balance.stockKey).toBe(`LOT:${lot.id}`);
    expect(valuation.averageUnitCost.toString()).toBe("12.5");
    expect(movement.items).toHaveLength(1);
    expect(movement.items[0]?.quantity.toString()).toBe("10");
  });

  it("mantém lote e serial únicos por produto", async () => {
    await prisma.inventoryLot.create({
      data: { productId, lotCode: "LOTE-X" },
    });

    await expect(
      prisma.inventoryLot.create({
        data: { productId, lotCode: "LOTE-X" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    const firstSerial = await prisma.serialItem.create({
      data: { productId, serialNumber: "SER-001" },
    });
    expect(firstSerial.serialNumber).toBe("SER-001");

    await expect(
      prisma.serialItem.create({
        data: { productId, serialNumber: "SER-001" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
