import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import {
  createWarehouse,
} from "../src/modules/locations/warehouses.service.js";
import {
  createStorageLocation,
  updateStorageLocation,
} from "../src/modules/locations/storage-locations.service.js";

describe("hierarquia física do almoxarifado", () => {
  beforeEach(async () => {
    await prisma.productLocation.deleteMany();
    await prisma.storageLocation.deleteMany();
    await prisma.warehouse.deleteMany();
  });

  it("normaliza código do almoxarifado e aceita posição direto na raiz", async () => {
    const warehouse = await createWarehouse({
      code: " alm-01 ",
      name: "Almoxarifado principal",
    });

    const position = await createStorageLocation(warehouse.id, {
      kind: "POSITION",
      code: " p-01 ",
      occupancyMode: "DEDICATED",
    });

    expect(warehouse.code).toBe("ALM-01");
    expect(position.code).toBe("P-01");
    expect(position.parentId).toBeNull();
  });

  it("aceita níveis intermediários omitidos mantendo ordem crescente", async () => {
    const warehouse = await createWarehouse({
      code: "ALM-01",
      name: "Principal",
    });
    const aisle = await createStorageLocation(warehouse.id, {
      kind: "AISLE",
      code: "A",
    });
    const shelf = await createStorageLocation(warehouse.id, {
      kind: "SHELF",
      code: "A-P02",
      parentId: aisle.id,
    });
    const position = await createStorageLocation(warehouse.id, {
      kind: "POSITION",
      code: "A-P02-01",
      parentId: shelf.id,
      occupancyMode: "SHARED",
    });

    expect(position.parentId).toBe(shelf.id);
  });

  it("rejeita retrocesso de nível e pai de outro almoxarifado", async () => {
    const first = await createWarehouse({ code: "A1", name: "Primeiro" });
    const second = await createWarehouse({ code: "A2", name: "Segundo" });
    const shelf = await createStorageLocation(first.id, {
      kind: "SHELF",
      code: "P01",
    });

    await expect(
      createStorageLocation(first.id, {
        kind: "AISLE",
        code: "COR-01",
        parentId: shelf.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOCATION_PARENT", status: 400 });

    await expect(
      createStorageLocation(second.id, {
        kind: "POSITION",
        code: "POS-01",
        parentId: shelf.id,
        occupancyMode: "SHARED",
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOCATION_PARENT", status: 400 });
  });

  it("exige ocupação em posição e proíbe ocupação nos demais níveis", async () => {
    const warehouse = await createWarehouse({ code: "A1", name: "Principal" });

    await expect(
      createStorageLocation(warehouse.id, {
        kind: "POSITION",
        code: "POS-01",
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOCATION", status: 400 });

    await expect(
      createStorageLocation(warehouse.id, {
        kind: "RACK",
        code: "EST-01",
        occupancyMode: "DEDICATED",
      }),
    ).rejects.toMatchObject({ code: "INVALID_LOCATION", status: 400 });
  });

  it("rejeita ciclo ao mover localização para um descendente", async () => {
    const warehouse = await createWarehouse({ code: "A1", name: "Principal" });
    const aisle = await createStorageLocation(warehouse.id, {
      kind: "AISLE",
      code: "A",
    });
    const rack = await createStorageLocation(warehouse.id, {
      kind: "RACK",
      code: "A-E01",
      parentId: aisle.id,
    });

    await expect(
      updateStorageLocation(aisle.id, { parentId: rack.id }),
    ).rejects.toMatchObject({ code: "LOCATION_CYCLE", status: 409 });
  });
});
