import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";

async function resetTables() {
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reorderPolicy.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
  await prisma.productLocation.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.department.deleteMany();
  await prisma.productIdentifier.deleteMany();
  await prisma.productUnitConversion.deleteMany();
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
  const codes = [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_MOVE,
    PERMISSIONS.ALERTS_READ,
    PERMISSIONS.ALERTS_MANAGE,
    PERMISSIONS.AUDIT_READ,
  ];
  const permissions = await Promise.all(
    codes.map((code) => prisma.permission.create({ data: { code, name: code } })),
  );
  const role = await prisma.role.create({
    data: {
      code: "PHASE-1E",
      name: "Fase 1E",
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
  });
  const user = await prisma.user.create({
    data: {
      username: "phase1e-user",
      displayName: "Operador 1E",
      passwordHash: await hashSecret("senha-teste-1e"),
      roles: { create: { roleId: role.id } },
    },
  });
  const category = await prisma.category.create({ data: { code: "P1E", name: "Fase 1E" } });
  const unit = await prisma.unitOfMeasure.create({
    data: { code: "UN-P1E", name: "Unidade", symbol: "un" },
  });
  const product = await prisma.product.create({
    data: {
      sku: "ALM-1E-001",
      name: "Rolamento de teste",
      categoryId: category.id,
      baseUnitId: unit.id,
    },
  });
  const warehouse = await prisma.warehouse.create({ data: { code: "P1E", name: "Almoxarifado 1E" } });
  const first = await prisma.storageLocation.create({
    data: { warehouseId: warehouse.id, kind: "POSITION", code: "P1E-A01", occupancyMode: "SHARED" },
  });
  const second = await prisma.storageLocation.create({
    data: { warehouseId: warehouse.id, kind: "POSITION", code: "P1E-A02", occupancyMode: "SHARED" },
  });
  await prisma.productLocation.createMany({
    data: [
      { productId: product.id, warehouseId: warehouse.id, locationId: first.id, isPrimary: true },
      { productId: product.id, warehouseId: warehouse.id, locationId: second.id },
    ],
  });
  return { user, product, first, second };
}

async function login(agent: ReturnType<typeof request.agent>) {
  await agent
    .post("/api/auth/admin/login")
    .send({ username: "phase1e-user", password: "senha-teste-1e" })
    .expect(200);
}

describe("Fase 1E HTTP", () => {
  beforeEach(resetTables);

  it("mantém política, alertas idempotentes e trilha de auditoria", async () => {
    const { user, product, first, second } = await prepare();
    const agent = request.agent(app);
    await login(agent);

    const policy = await agent
      .put(`/api/alerts/policies/${product.id}`)
      .send({ minimumStock: "5", maximumStock: "20", reorderPoint: "8", expiryWarningDays: 30 })
      .expect(200);
    expect(policy.body.policy.reorderPoint).toBe("8");

    await agent.post("/api/inventory/entries").send({
      productId: product.id,
      toLocationId: first.id,
      quantity: "2",
      unitCost: "10",
    }).expect(201);
    await agent.post("/api/inventory/entries").send({
      productId: product.id,
      toLocationId: second.id,
      quantity: "1",
      unitCost: "10",
    }).expect(201);

    const firstEvaluation = await agent.post("/api/alerts/evaluate").expect(200);
    expect(firstEvaluation.body).toMatchObject({ created: 3, active: 3 });

    const secondEvaluation = await agent.post("/api/alerts/evaluate").expect(200);
    expect(secondEvaluation.body).toMatchObject({ created: 0, refreshed: 3, active: 3 });

    const active = await agent.get("/api/alerts").query({ active: true }).expect(200);
    expect(active.body.alerts.map((alert: { type: string }) => alert.type).sort()).toEqual(
      ["BELOW_MINIMUM", "FRAGMENTATION", "REORDER"].sort(),
    );

    const audit = await agent
      .get("/api/audit")
      .query({ action: "REORDER_POLICY_UPDATED" })
      .expect(200);
    expect(audit.body.logs).toHaveLength(1);
    expect(audit.body.logs[0]).toMatchObject({
      actorUserId: user.id,
      action: "REORDER_POLICY_UPDATED",
      entityType: "ReorderPolicy",
    });
  });
});
