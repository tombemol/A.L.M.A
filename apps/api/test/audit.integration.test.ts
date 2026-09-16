import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";
import {
  approveWithdrawalRequest,
  createDirectWithdrawal,
  createWithdrawalRequest,
  fulfillWithdrawalRequest,
} from "../src/modules/withdrawals/withdrawals.service.js";

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

async function prepareFixture() {
  const user = await prisma.user.create({
    data: {
      username: "audit-operator",
      displayName: "Operador Auditável",
      active: true,
    },
  });
  const category = await prisma.category.create({
    data: { code: "AUD-CAT", name: "Auditoria" },
  });
  const unit = await prisma.unitOfMeasure.create({
    data: { code: "AUD-UN", name: "Unidade", symbol: "un" },
  });
  const product = await prisma.product.create({
    data: {
      sku: "AUD-001",
      name: "Material auditável",
      categoryId: category.id,
      baseUnitId: unit.id,
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { code: "AUD", name: "Almoxarifado Auditoria" },
  });
  const location = await prisma.storageLocation.create({
    data: {
      warehouseId: warehouse.id,
      kind: "POSITION",
      code: "AUD-A01",
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
  const department = await prisma.department.create({
    data: { code: "AUD-MAN", name: "Manutenção" },
  });

  return { user, product, location, department };
}

describe("auditoria transacional da Fase 1E", () => {
  beforeEach(resetTables);

  it("registra a entrada quando o serviço de estoque conclui a movimentação", async () => {
    const { user, product, location } = await prepareFixture();

    const result = await postInventoryMovement(user.id, {
      type: "ENTRY",
      productId: product.id,
      toLocationId: location.id,
      quantity: "5",
      unitCost: "10",
      reference: "NF-AUD-001",
    });

    const log = await prisma.auditLog.findFirst({
      where: {
        actorUserId: user.id,
        action: "INVENTORY_ENTRY",
        entityType: "StockMovement",
        entityId: result.movement.id,
      },
    });

    expect(log).not.toBeNull();
    expect(log?.after).toMatchObject({
      type: "ENTRY",
      productId: product.id,
      quantity: "5",
      toLocationId: location.id,
    });
  });

  it("registra solicitação, aprovação e atendimento sem depender da rota HTTP", async () => {
    const { user, product, location, department } = await prepareFixture();

    await postInventoryMovement(user.id, {
      type: "ENTRY",
      productId: product.id,
      toLocationId: location.id,
      quantity: "10",
      unitCost: "10",
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { requiresWithdrawalApproval: true },
    });

    const request = await createWithdrawalRequest(user.id, {
      productId: product.id,
      quantity: "2",
      departmentId: department.id,
      fromLocationId: location.id,
      notes: "Teste de auditoria",
    });
    await approveWithdrawalRequest(user.id, request.id, "Aprovado para teste");
    const fulfilled = await fulfillWithdrawalRequest(user.id, request.id, {
      fromLocationId: location.id,
    });

    const actions = await prisma.auditLog.findMany({
      where: {
        entityType: "WithdrawalRequest",
        entityId: request.id,
      },
      orderBy: { createdAt: "asc" },
      select: { action: true, actorUserId: true },
    });

    expect(actions).toEqual([
      { action: "WITHDRAWAL_REQUESTED", actorUserId: user.id },
      { action: "WITHDRAWAL_APPROVED", actorUserId: user.id },
      { action: "WITHDRAWAL_FULFILLED", actorUserId: user.id },
    ]);
    expect(fulfilled.request.stockMovementId).toBeTruthy();
  });

  it("registra retirada direta como uma ação operacional única", async () => {
    const { user, product, location, department } = await prepareFixture();

    await postInventoryMovement(user.id, {
      type: "ENTRY",
      productId: product.id,
      toLocationId: location.id,
      quantity: "4",
      unitCost: "10",
    });

    const result = await createDirectWithdrawal(user.id, {
      productId: product.id,
      quantity: "1",
      departmentId: department.id,
      fromLocationId: location.id,
    });

    const logs = await prisma.auditLog.findMany({
      where: {
        action: "WITHDRAWAL_DIRECT",
        entityType: "WithdrawalRequest",
        entityId: result.request.id,
      },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.actorUserId).toBe(user.id);
  });
});
