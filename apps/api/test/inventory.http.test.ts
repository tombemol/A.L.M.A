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
  await prisma.productUnitConversion.deleteMany();
  await prisma.productIdentifier.deleteMany();
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

async function createInventoryUser(permissionCodes: string[]) {
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.create({
        data: { code, name: code },
      }),
    ),
  );
  const role = await prisma.role.create({
    data: {
      code: `ROLE-${permissionCodes.join("-")}`,
      name: "Inventário",
      permissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
    },
  });
  await prisma.user.create({
    data: {
      username: "inventory-user",
      displayName: "Usuário do inventário",
      passwordHash: await hashSecret("super-secret-password"),
      roles: { create: { roleId: role.id } },
    },
  });
}

async function createInventoryFixture() {
  const category = await prisma.category.create({
    data: { code: "INV", name: "Inventário" },
  });
  const unit = await prisma.unitOfMeasure.create({
    data: { code: "UN", name: "Unidade", symbol: "un" },
  });
  const product = await prisma.product.create({
    data: {
      sku: "INV-001",
      name: "Material de teste",
      categoryId: category.id,
      baseUnitId: unit.id,
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { code: "ALM-HTTP", name: "Almoxarifado HTTP" },
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

  return { product, location };
}

describe("API HTTP de inventário", () => {
  beforeEach(resetTables);

  it("protege movimentações e consultas contra acesso anônimo", async () => {
    await request(app).post("/api/inventory/movements").send({}).expect(401);
    await request(app).get("/api/inventory/balances").expect(401);
    await request(app).get("/api/inventory/movements").expect(401);
  });

  it("registra entrada e expõe saldo e histórico para usuário autorizado", async () => {
    await createInventoryUser([
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_MOVE,
    ]);
    const { product, location } = await createInventoryFixture();

    const agent = request.agent(app);
    await agent
      .post("/api/auth/admin/login")
      .send({
        username: "inventory-user",
        password: "super-secret-password",
      })
      .expect(200);

    const movementResponse = await agent
      .post("/api/inventory/movements")
      .send({
        type: "ENTRY",
        productId: product.id,
        toLocationId: location.id,
        quantity: "4",
        unitCost: "12.5",
        reference: "NF-HTTP-001",
      })
      .expect(201);

    expect(movementResponse.body.movement.type).toBe("ENTRY");
    expect(movementResponse.body.movement.items[0].quantity).toBe("4");

    const balanceResponse = await agent
      .get("/api/inventory/balances")
      .query({ productId: product.id })
      .expect(200);

    expect(balanceResponse.body.balances).toHaveLength(1);
    expect(balanceResponse.body.balances[0].quantity).toBe("4");
    expect(balanceResponse.body.balances[0].product.sku).toBe("INV-001");
    expect(balanceResponse.body.valuation.quantity).toBe("4");
    expect(balanceResponse.body.valuation.averageUnitCost).toBe("12.5");

    const historyResponse = await agent
      .get("/api/inventory/movements")
      .query({ productId: product.id })
      .expect(200);

    expect(historyResponse.body.movements).toHaveLength(1);
    expect(historyResponse.body.movements[0].reference).toBe("NF-HTTP-001");
    expect(historyResponse.body.movements[0].items[0].product.sku).toBe(
      "INV-001",
    );
  });

  it("separa permissão de leitura da permissão de movimentar", async () => {
    await createInventoryUser([PERMISSIONS.INVENTORY_READ]);
    const { product, location } = await createInventoryFixture();

    const agent = request.agent(app);
    await agent
      .post("/api/auth/admin/login")
      .send({
        username: "inventory-user",
        password: "super-secret-password",
      })
      .expect(200);

    await agent.get("/api/inventory/balances").expect(200);
    await agent
      .post("/api/inventory/movements")
      .send({
        type: "ENTRY",
        productId: product.id,
        toLocationId: location.id,
        quantity: "1",
        unitCost: "1",
      })
      .expect(403);
  });
});
