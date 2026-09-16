import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import {
  associateProductLocation,
  listProductLocations,
} from "../src/modules/locations/product-locations.service.js";

describe("associação produto-localização", () => {
  let categoryId: string;
  let unitId: string;
  let firstProductId: string;
  let secondProductId: string;
  let warehouseId: string;
  let dedicatedId: string;
  let sharedId: string;
  let secondSharedId: string;

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
    const firstProduct = await prisma.product.create({
      data: {
        sku: "ROL-6204",
        name: "Rolamento 6204",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const secondProduct = await prisma.product.create({
      data: {
        sku: "ROL-6205",
        name: "Rolamento 6205",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-01", name: "Principal" },
    });
    const dedicated = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "POS-D",
        occupancyMode: "DEDICATED",
      },
    });
    const shared = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "POS-C1",
        occupancyMode: "SHARED",
      },
    });
    const secondShared = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "POS-C2",
        occupancyMode: "SHARED",
      },
    });

    categoryId = category.id;
    unitId = unit.id;
    firstProductId = firstProduct.id;
    secondProductId = secondProduct.id;
    warehouseId = warehouse.id;
    dedicatedId = dedicated.id;
    sharedId = shared.id;
    secondSharedId = secondShared.id;
  });

  it("impede dois produtos diferentes em posição dedicada", async () => {
    await associateProductLocation(firstProductId, {
      locationId: dedicatedId,
      isPrimary: false,
    });

    await expect(
      associateProductLocation(secondProductId, {
        locationId: dedicatedId,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({
      code: "DEDICATED_LOCATION_OCCUPIED",
      status: 409,
    });
  });

  it("permite vários produtos em posição compartilhada", async () => {
    await associateProductLocation(firstProductId, {
      locationId: sharedId,
      isPrimary: false,
    });
    await associateProductLocation(secondProductId, {
      locationId: sharedId,
      isPrimary: false,
    });

    const associations = await prisma.productLocation.findMany({
      where: { locationId: sharedId },
    });

    expect(associations).toHaveLength(2);
  });

  it("permite múltiplas posições e troca a principal no mesmo almoxarifado", async () => {
    await associateProductLocation(firstProductId, {
      locationId: sharedId,
      isPrimary: true,
    });
    await associateProductLocation(firstProductId, {
      locationId: secondSharedId,
      isPrimary: true,
    });

    const associations = await listProductLocations(firstProductId);
    expect(associations).toHaveLength(2);
    expect(
      associations.filter((association) => association.isPrimary),
    ).toHaveLength(1);
    expect(
      associations.find((association) => association.isPrimary)?.locationId,
    ).toBe(secondSharedId);
  });

  it("rejeita produto inativo, localização inativa e nível que não é posição", async () => {
    await prisma.product.update({
      where: { id: firstProductId },
      data: { active: false },
    });

    await expect(
      associateProductLocation(firstProductId, {
        locationId: sharedId,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });

    await prisma.product.update({
      where: { id: firstProductId },
      data: { active: true },
    });
    await prisma.storageLocation.update({
      where: { id: sharedId },
      data: { active: false },
    });

    await expect(
      associateProductLocation(firstProductId, {
        locationId: sharedId,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });

    const rack = await prisma.storageLocation.create({
      data: {
        warehouseId,
        kind: "RACK",
        code: "EST-01",
      },
    });

    await expect(
      associateProductLocation(firstProductId, {
        locationId: rack.id,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PRIMARY_LOCATION",
      status: 400,
    });
  });
});
