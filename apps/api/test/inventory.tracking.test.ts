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

describe("rastreabilidade de estoque", () => {
  let lotProductId: string;
  let serialProductId: string;
  let locationId: string;
  let secondLocationId: string;

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
      data: { code: "RAS", name: "Rastreáveis" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const lotProduct = await prisma.product.create({
      data: {
        sku: "OLEO-LOT",
        name: "Óleo industrial",
        categoryId: category.id,
        baseUnitId: unit.id,
        trackingMode: "LOT_EXPIRY",
      },
    });
    const serialProduct = await prisma.product.create({
      data: {
        sku: "MOTOR-SER",
        name: "Motor elétrico",
        categoryId: category.id,
        baseUnitId: unit.id,
        trackingMode: "SERIAL",
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-RAS", name: "Rastreáveis" },
    });
    const location = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "R-01-01",
        occupancyMode: "SHARED",
      },
    });
    const secondLocation = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "R-01-02",
        occupancyMode: "SHARED",
      },
    });
    await prisma.productLocation.createMany({
      data: [
        {
          productId: lotProduct.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          isPrimary: true,
        },
        {
          productId: serialProduct.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          isPrimary: true,
        },
        {
          productId: serialProduct.id,
          warehouseId: warehouse.id,
          locationId: secondLocation.id,
          isPrimary: false,
        },
      ],
    });

    lotProductId = lotProduct.id;
    serialProductId = serialProduct.id;
    locationId = location.id;
    secondLocationId = secondLocation.id;
  });

  afterEach(resetInventoryTables);

  it("cria lote com validade na entrada e reutiliza o lote na saída", async () => {
    const entry = await postInventoryMovement(null, {
      type: "ENTRY",
      productId: lotProductId,
      toLocationId: locationId,
      quantity: "5",
      unitCost: "7",
      tracking: {
        lotCode: "L-2026-09",
        expiresAt: "2027-01-31T00:00:00.000Z",
      },
    });

    const lot = await prisma.inventoryLot.findUniqueOrThrow({
      where: {
        productId_lotCode: {
          productId: lotProductId,
          lotCode: "L-2026-09",
        },
      },
    });

    await postInventoryMovement(null, {
      type: "WITHDRAWAL",
      productId: lotProductId,
      fromLocationId: locationId,
      quantity: "2",
      tracking: { lotCode: "L-2026-09" },
    });

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId: lotProductId,
          locationId,
          stockKey: `LOT:${lot.id}`,
        },
      },
    });
    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId: lotProductId },
    });

    expect(lot.expiresAt?.toISOString()).toBe("2027-01-31T00:00:00.000Z");
    expect(entry.movement.items[0]?.lotId).toBe(lot.id);
    expect(balance.quantity.toString()).toBe("3");
    expect(valuation.quantity.toString()).toBe("3");
    expect(valuation.totalValue.toString()).toBe("21");
  });

  it("normaliza código de lote para maiúsculas e reutiliza a mesma identidade", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId: lotProductId,
      toLocationId: locationId,
      quantity: "2",
      unitCost: "4",
      tracking: {
        lotCode: "  lote-a  ",
        expiresAt: "2027-02-28T00:00:00.000Z",
      },
    });

    await postInventoryMovement(null, {
      type: "WITHDRAWAL",
      productId: lotProductId,
      fromLocationId: locationId,
      quantity: "1",
      tracking: { lotCode: "LOTE-A" },
    });

    const lots = await prisma.inventoryLot.findMany({
      where: { productId: lotProductId },
    });

    expect(lots).toHaveLength(1);
    expect(lots[0]?.lotCode).toBe("LOTE-A");
  });

  it("exige validade ao criar lote quando o produto usa LOT_EXPIRY", async () => {
    await expect(
      postInventoryMovement(null, {
        type: "ENTRY",
        productId: lotProductId,
        toLocationId: locationId,
        quantity: "1",
        unitCost: "5",
        tracking: { lotCode: "SEM-VALIDADE" },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "TRACKING_EXPIRY_REQUIRED",
        status: 400,
      }),
    );

    expect(await prisma.inventoryLot.count()).toBe(0);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("exige quantidade unitária para produto serializado", async () => {
    await expect(
      postInventoryMovement(null, {
        type: "ENTRY",
        productId: serialProductId,
        toLocationId: locationId,
        quantity: "2",
        unitCost: "300",
        tracking: { serialNumber: "MTR-0001" },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "SERIAL_QUANTITY_MUST_BE_ONE",
        status: 400,
      }),
    );
  });

  it("não inventa serial inexistente em uma saída", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId: serialProductId,
      toLocationId: locationId,
      quantity: "1",
      unitCost: "300",
      tracking: { serialNumber: "MTR-0001" },
    });

    await expect(
      postInventoryMovement(null, {
        type: "WITHDRAWAL",
        productId: serialProductId,
        fromLocationId: locationId,
        quantity: "1",
        tracking: { serialNumber: "MTR-9999" },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "TRACKING_NOT_FOUND",
        status: 404,
      }),
    );
  });

  it("impede o mesmo serial com saldo positivo em duas posições", async () => {
    await postInventoryMovement(null, {
      type: "ENTRY",
      productId: serialProductId,
      toLocationId: locationId,
      quantity: "1",
      unitCost: "300",
      tracking: { serialNumber: "MTR-0002" },
    });

    await expect(
      postInventoryMovement(null, {
        type: "RETURN",
        productId: serialProductId,
        toLocationId: secondLocationId,
        quantity: "1",
        tracking: { serialNumber: "MTR-0002" },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "SERIAL_ALREADY_IN_STOCK",
        status: 409,
      }),
    );

    const positiveBalances = await prisma.inventoryBalance.findMany({
      where: {
        productId: serialProductId,
        quantity: { gt: 0 },
      },
    });
    expect(positiveBalances).toHaveLength(1);
    expect(positiveBalances[0]?.locationId).toBe(locationId);
  });
});
