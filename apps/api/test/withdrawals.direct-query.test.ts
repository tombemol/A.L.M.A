import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { postInventoryMovement } from "../src/modules/inventory/inventory-ledger.service.js";
import {
  createDirectWithdrawal,
  getWithdrawalRequest,
  listWithdrawalRequests,
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
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
}

describe("retirada direta e histórico", () => {
  let userId: string;
  let productId: string;
  let departmentId: string;
  let locationId: string;

  beforeEach(async () => {
    await resetTables();

    const user = await prisma.user.create({
      data: { employeeCode: "7301", displayName: "Almoxarife direto" },
    });
    const category = await prisma.category.create({
      data: { code: "DIR", name: "Direta" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN-DIR", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "DIR-001",
        name: "Material comum",
        categoryId: category.id,
        baseUnitId: unit.id,
      },
    });
    const department = await prisma.department.create({
      data: { code: "PROD", name: "Produção" },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: "ALM-DIR", name: "Almoxarifado direto" },
    });
    const location = await prisma.storageLocation.create({
      data: {
        warehouseId: warehouse.id,
        kind: "POSITION",
        code: "DIR-P01",
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
    await postInventoryMovement(user.id, {
      type: "ENTRY",
      productId: product.id,
      toLocationId: location.id,
      quantity: "5",
      unitCost: "12",
    });

    userId = user.id;
    productId = product.id;
    departmentId = department.id;
    locationId = location.id;
  });

  afterEach(resetTables);

  it("retira material comum diretamente e preserva autoria/destino", async () => {
    const result = await createDirectWithdrawal(userId, {
      productId,
      quantity: "2",
      departmentId,
      fromLocationId: locationId,
      notes: "Uso imediato na linha",
    });

    expect(result.request.status).toBe("FULFILLED");
    expect(result.request.requesterUserId).toBe(userId);
    expect(result.request.fulfilledByUserId).toBe(userId);
    expect(result.request.departmentId).toBe(departmentId);
    expect(result.request.fromLocationId).toBe(locationId);
    expect(result.movement.type).toBe("WITHDRAWAL");

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        productId_locationId_stockKey: {
          productId,
          locationId,
          stockKey: "NONE",
        },
      },
    });
    expect(balance.quantity.toString()).toBe("3");
  });

  it("bloqueia retirada direta quando produto exige aprovação", async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { requiresWithdrawalApproval: true },
    });

    await expect(
      createDirectWithdrawal(userId, {
        productId,
        quantity: "1",
        departmentId,
        fromLocationId: locationId,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "WITHDRAWAL_APPROVAL_REQUIRED",
        status: 409,
      }),
    );

    expect(await prisma.stockMovement.count({ where: { type: "WITHDRAWAL" } })).toBe(0);
  });

  it("lista e detalha histórico com filtros e atores", async () => {
    const direct = await createDirectWithdrawal(userId, {
      productId,
      quantity: "1",
      departmentId,
      fromLocationId: locationId,
    });

    const list = await listWithdrawalRequests({
      status: "FULFILLED",
      productId,
      departmentId,
      requesterUserId: userId,
      page: 1,
      limit: 10,
    });
    expect(list.total).toBe(1);
    expect(list.requests[0]?.id).toBe(direct.request.id);
    expect(list.requests[0]?.requester.id).toBe(userId);
    expect(list.requests[0]?.fulfilledBy?.id).toBe(userId);

    const detail = await getWithdrawalRequest(direct.request.id);
    expect(detail.department.id).toBe(departmentId);
    expect(detail.stockMovement?.id).toBe(direct.movement.id);
    expect(detail.stockMovement?.items).toHaveLength(1);
  });
});
