import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import {
  createProduct,
  replaceProductConversions,
  resolveProduct,
} from "../src/modules/catalog/products.service.js";

describe("catálogo de produtos", () => {
  let categoryId: string;
  let unitId: string;
  let boxUnitId: string;

  beforeEach(async () => {
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
    const box = await prisma.unitOfMeasure.create({
      data: { code: "CX", name: "Caixa", symbol: "cx" },
    });

    categoryId = category.id;
    unitId = unit.id;
    boxUnitId = box.id;
  });

  it("normaliza SKU e resolve por SKU ou identificador", async () => {
    const product = await createProduct({
      sku: " rol-6204 ",
      name: "Rolamento 6204",
      categoryId,
      baseUnitId: unitId,
      identifiers: [
        { type: "EAN", value: " 789100006204 " },
      ],
      conversions: [
        { unitId: boxUnitId, factorToBase: 100 },
      ],
    });

    expect(product.sku).toBe("ROL-6204");
    expect((await resolveProduct("rol-6204")).id).toBe(product.id);
    expect((await resolveProduct("789100006204")).id).toBe(product.id);
  });

  it("rejeita SKU duplicado", async () => {
    await createProduct({
      sku: "ROL-6204",
      name: "Rolamento 6204",
      categoryId,
      baseUnitId: unitId,
    });

    await expect(
      createProduct({
        sku: " rol-6204 ",
        name: "Duplicado",
        categoryId,
        baseUnitId: unitId,
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_SKU", status: 409 });
  });

  it("rejeita identificador global duplicado", async () => {
    await createProduct({
      sku: "ROL-6204",
      name: "Rolamento 6204",
      categoryId,
      baseUnitId: unitId,
      identifiers: [{ type: "OTHER", value: "COD-01" }],
    });

    await expect(
      createProduct({
        sku: "ROL-6205",
        name: "Rolamento 6205",
        categoryId,
        baseUnitId: unitId,
        identifiers: [{ type: "OTHER", value: " cod-01 " }],
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_IDENTIFIER", status: 409 });
  });

  it("rejeita unidade base como conversão alternativa", async () => {
    const product = await createProduct({
      sku: "ROL-6204",
      name: "Rolamento 6204",
      categoryId,
      baseUnitId: unitId,
    });

    await expect(
      replaceProductConversions(product.id, {
        conversions: [{ unitId, factorToBase: 1 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_CONVERSION", status: 400 });
  });
});
