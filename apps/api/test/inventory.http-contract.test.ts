import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";

async function resetTables() {
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
  await prisma.productLocation.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

async function prepare() {
  const permissions = await Promise.all(
    [PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_MOVE].map((code) =>
      prisma.permission.create({ data: { code, name: code } }),
    ),
  );
  const role = await prisma.role.create({
    data: {
      code: "INVENTORY-HTTP-CONTRACT",
      name: "Inventário HTTP",
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
  });
  const user = await prisma.user.create({
    data: {
      username: "inventory-contract-user",
      displayName: "Usuário inventário",
      passwordHash: await hashSecret("super-secret-password"),
      roles: { create: { roleId: role.id } },
    },
  });
  const category = await prisma.category.create({ data: { code: "ICT", name: "HTTP" } });
  const unit = await prisma.unitOfMeasure.create({
    data: { code: "UN", name: "Unidade", symbol: "un" },
  });
  const product = await prisma.product.create({
    data: {
      sku: "ICT-001",
      name: "Material HTTP",
      categoryId: category.id,
      baseUnitId: unit.id,
    },
  });
  const warehouse = await prisma.warehouse.create({ data: { code: "ICT", name: "HTTP" } });
  const first = await prisma.storageLocation.create({
    data: { warehouseId: warehouse.id, kind: "POSITION", code: "A-01", occupancyMode: "SHARED" },
  });
  const second = await prisma.storageLocation.create({
    data: { warehouseId: warehouse.id, kind: "POSITION", code: "A-02", occupancyMode: "SHARED" },
  });
  await prisma.productLocation.createMany({
    data: [
      { productId: product.id, warehouseId: warehouse.id, locationId: first.id, isPrimary: true },
      { productId: product.id, warehouseId: warehouse.id, locationId: second.id, isPrimary: false },
    ],
  });
  return { user, product, first, second };
}

async function login(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/api/auth/admin/login")
    .send({ username: "inventory-contract-user", password: "super-secret-password" })
    .expect(200);
}

describe("contrato semântico da API de inventário", () => {
  beforeEach(resetTables);

  it("oferece entrada, summary e paginação sem aceitar ator do cliente", async () => {
    const { user, product, first } = await prepare();
    const agent = request.agent(app);
    await login(agent);

    const entry = await agent
      .post("/api/inventory/entries")
      .send({
        productId: product.id,
        toLocationId: first.id,
        quantity: "4",
        unitCost: "12.5",
        reference: "NF-001",
        performedByUserId: "ignorado",
      })
      .expect(201);

    expect(entry.body.movement.performedByUserId).toBe(user.id);

    const summary = await agent
      .get(`/api/inventory/products/${product.id}/summary`)
      .expect(200);
    expect(summary.body).toMatchObject({
      quantity: "4",
      averageUnitCost: "12.5",
      totalValue: "50",
    });
    expect(summary.body.balances).toHaveLength(1);

    const history = await agent
      .get("/api/inventory/movements")
      .query({ productId: product.id, page: 1, limit: 1 })
      .expect(200);
    expect(history.body.movements).toHaveLength(1);
    expect(history.body.pagination).toEqual({ page: 1, limit: 1 });
  });

  it("oferece rotas próprias para transferência e ajuste", async () => {
    const { product, first, second } = await prepare();
    const agent = request.agent(app);
    await login(agent);

    await agent.post("/api/inventory/entries").send({
      productId: product.id,
      toLocationId: first.id,
      quantity: "5",
      unitCost: "10",
    }).expect(201);

    const transfer = await agent.post("/api/inventory/transfers").send({
      productId: product.id,
      fromLocationId: first.id,
      toLocationId: second.id,
      quantity: "2",
    }).expect(201);
    expect(transfer.body.movement.type).toBe("TRANSFER");

    const adjustment = await agent.post("/api/inventory/adjustments").send({
      type: "ADJUSTMENT_IN",
      productId: product.id,
      toLocationId: second.id,
      quantity: "1",
      reason: "Contagem física",
    }).expect(201);
    expect(adjustment.body.movement.type).toBe("ADJUSTMENT_IN");
  });

  it("filtra saldos por lote de forma canônica", async () => {
    const { product, first } = await prepare();
    await prisma.product.update({ where: { id: product.id }, data: { trackingMode: "LOT" } });
    const agent = request.agent(app);
    await login(agent);

    await agent.post("/api/inventory/entries").send({
      productId: product.id,
      toLocationId: first.id,
      quantity: "2",
      unitCost: "5",
      tracking: { lotCode: " lote-api " },
    }).expect(201);

    const result = await agent.get("/api/inventory/balances").query({ lotCode: "lote-api" }).expect(200);
    expect(result.body.balances).toHaveLength(1);
    expect(result.body.balances[0].lot.lotCode).toBe("LOTE-API");
  });
});
