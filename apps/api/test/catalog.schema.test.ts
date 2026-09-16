import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";

async function resetCatalogTables() {
  await prisma.productLocation.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.productUnitConversion.deleteMany();
  await prisma.productIdentifier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
}

describe("persistência da Fase 1B", () => {
  beforeEach(resetCatalogTables);

  it("persiste catálogo e localização física", async () => {
    const category = await prisma.category.create({
      data: { code: "MEC", name: "Mecânica" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        code: "UN",
        name: "Unidade",
        symbol: "un",
        allowsDecimal: false,
      },
    });
    const product = await prisma.product.create({
      data: {
        sku: "ROL-6204",
        name: "Rolamento 6204",
        categoryId: category.id,
        baseUnitId: unit.id,
        identifiers: {
          create: {
            type: "EAN",
            value: "789100006204",
            normalizedValue: "789100006204",
          },
        },
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-01", name: "Almoxarifado principal" },
    });
    const position = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "B-E03-P02-04",
        occupancyMode: "DEDICATED",
      },
    });
    const association = await prisma.productLocation.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: position.id,
        isPrimary: true,
      },
    });

    expect(association.isPrimary).toBe(true);
    expect(product.sku).toBe("ROL-6204");
  });

  it("mantém SKU e identificador globalmente únicos", async () => {
    const category = await prisma.category.create({
      data: { code: "ELE", name: "Elétrica" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });

    await prisma.product.create({
      data: {
        sku: "ELE-DJ32",
        name: "Disjuntor 32 A",
        categoryId: category.id,
        baseUnitId: unit.id,
        identifiers: {
          create: {
            type: "INTERNAL_BARCODE",
            value: "DJ32-001",
            normalizedValue: "DJ32-001",
          },
        },
      },
    });

    await expect(
      prisma.product.create({
        data: {
          sku: "ELE-DJ32",
          name: "Duplicado",
          categoryId: category.id,
          baseUnitId: unit.id,
        },
      }),
    ).rejects.toBeDefined();

    const second = await prisma.product.create({
      data: {
        sku: "ELE-DJ40",
        name: "Disjuntor 40 A",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });

    await expect(
      prisma.productIdentifier.create({
        data: {
          productId: second.id,
          type: "OTHER",
          value: "dj32-001",
          normalizedValue: "DJ32-001",
        },
      }),
    ).rejects.toBeDefined();
  });
});
