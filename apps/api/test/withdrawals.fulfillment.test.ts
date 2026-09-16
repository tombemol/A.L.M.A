import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";
import {
  createWithdrawalRequest,
  fulfillWithdrawalRequest,
  rejectWithdrawalRequest,
} from "../src/modules/withdrawals/withdrawals.service.js";

async function resetTables() {
  await prisma.approval.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryValuation.deleteMany();
  await prisma.serialItem.deleteMany();
  await prisma.inventoryLot.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.department.deleteMany();
  await prisma.productLocation.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
}

describe("atendimento de retiradas", () => {
  let requesterUserId: string;
  let fulfillerUserId: string;
  let productId: string;
  let departmentId: string;
  let locationId: string;

  beforeEach(async () => {
    await resetTables();

    const [requester, fulfiller] = await Promise.all([
      prisma.user.create({
        data: { employeeCode: "7201", displayName: "Solicitante" },
      }),
      prisma.user.create({
        data: { employeeCode: "7202", displayName: "Almoxarife" },
      }),
    ]);
    const category = await prisma.category.create({
      data: { code: "RET", name: "Retirada" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "RET-001",
        name: "Material para retirada",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const department = await prisma.department.create({
      data: { code: "MAN", name: "Manutenção" },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-RET", name: "Almoxarifado de retirada" },
    });
    const location = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "R-01-01",
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
    await postInventoryMovement(fulfiller.id, {
      type: "ENTRY",
      productId: product.id,
      toLocationId: location.id,
      quantity: "5",
      unitCost: "10",
    });

    requesterUserId = requester.id;
    fulfillerUserId = fulfiller.id;
    productId = product.id;
    departmentId = department.id;
    locationId = location.id;
  });

  afterEach(resetTables);

  it("atende uma solicitação aprovada e baixa saldo/custo uma única vez", async () => {
    const request = await createWithdrawalRequest(requesterUserId, {
      productId,
      quantity: "2",
      departmentId,
    });

    const first = await fulfillWithdrawalRequest(fulfillerUserId, request.id, {
      fromLocationId: locationId,
    });
    const second = await fulfillWithdrawalRequest(fulfillerUserId, request.id, {
      fromLocationId: locationId,
    });

    expect(first.request.status).toBe("FULFILLED");
    expect(first.request.fulfilledByUserId).toBe(fulfillerUserId);
    expect(first.request.stockMovementId).toBe(first.movement.id);
    expect(first.movement.type).toBe("WITHDRAWAL");
    expect(first.movement.items[0]?.unitCost.toString()).toBe("10");
    expect(first.movement.items[0]?.totalCost.toString()).toBe("20");
    expect(second.movement.id).toBe(first.movement.id);

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId,
          stockKey: "NONE",
        },
      },
    });
    const valuation = await prisma.inventoryValuation.findUniqueOrThrow({
      where: { productId },
    });

    expect(balance.quantity.toString()).toBe("3");
    expect(valuation.quantity.toString()).toBe("3");
    expect(valuation.averageUnitCost.toString()).toBe("10");
    expect(valuation.totalValue.toString()).toBe("30");
    expect(await prisma.stockMovement.count({ where: { type: "WITHDRAWAL" } })).toBe(1);
  });

  it("faz rollback integral quando o saldo é insuficiente", async () => {
    const request = await createWithdrawalRequest(requesterUserId, {
      productId,
      quantity: "8",
      departmentId,
    });

    await expect(
      fulfillWithdrawalRequest(fulfillerUserId, request.id, {
        fromLocationId: locationId,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "INSUFFICIENT_STOCK",
        status: 409,
      }),
    );

    const persisted = await prisma.withdrawalRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(persisted.status).toBe("APPROVED");
    expect(persisted.stockMovementId).toBeNull();
    expect(await prisma.stockMovement.count({ where: { type: "WITHDRAWAL" } })).toBe(0);
  });

  it("não atende solicitação rejeitada", async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { requiresWithdrawalApproval: true },
    });
    const request = await createWithdrawalRequest(requesterUserId, {
      productId,
      quantity: "1",
      departmentId,
    });
    await rejectWithdrawalRequest(fulfillerUserId, request.id, "Não autorizado");

    await expect(
      fulfillWithdrawalRequest(fulfillerUserId, request.id, {
        fromLocationId: locationId,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "WITHDRAWAL_NOT_APPROVED",
        status: 409,
      }),
    );

    expect(await prisma.stockMovement.count({ where: { type: "WITHDRAWAL" } })).toBe(0);
  });
});
