import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { createWithdrawalRequest } from "../src/modules/withdrawals/withdrawals.service.js";

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
  await prisma.productUnitConversion.deleteMany();
  await prisma.productIdentifier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
}

describe("solicitações de retirada", () => {
  let requesterUserId: string;
  let departmentId: string;
  let equipmentId: string;
  let categoryId: string;
  let unitId: string;

  beforeEach(async () => {
    await resetTables();

    const requester = await prisma.user.create({
      data: { employeeCode: "7001", displayName: "Solicitante" },
    });
    const department = await prisma.department.create({
      data: { code: "MAN", name: "Manutenção" },
    });
    const equipment = await prisma.equipment.create({
      data: {
        departmentId: department.id,
        code: "MP-01",
        name: "Máquina de Papel 01",
      },
    });
    const category = await prisma.category.create({
      data: { code: "MEC", name: "Mecânica" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });

    requesterUserId = requester.id;
    departmentId = department.id;
    equipmentId = equipment.id;
    categoryId = category.id;
    unitId = unit.id;
  });

  afterEach(resetTables);

  async function createProduct(input?: {
    productApproval?: boolean;
    categoryApproval?: boolean;
  }) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { requiresWithdrawalApproval: input?.categoryApproval ?? false },
    });

    return prisma.product.create({
      data: {
        sku: `ITEM-${Math.random().toString(16).slice(2)}`,
        name: "Item de teste",
        categoryId,
        baseUnitId: unitId,
        requiresWithdrawalApproval: input?.productApproval ?? false,
      },
    });
  }

  it("mantém material controlado pendente sem movimentar estoque", async () => {
    const product = await createProduct({ productApproval: true });

    const request = await createWithdrawalRequest(requesterUserId, {
      productId: product.id,
      quantity: "2",
      departmentId,
      equipmentId,
      notes: "Troca preventiva",
    });

    expect(request.status).toBe("PENDING_APPROVAL");
    expect(request.requiresApprovalSnapshot).toBe(true);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("herda a exigência de aprovação da categoria", async () => {
    const product = await createProduct({ categoryApproval: true });

    const request = await createWithdrawalRequest(requesterUserId, {
      productId: product.id,
      quantity: "1",
      departmentId,
    });

    expect(request.status).toBe("PENDING_APPROVAL");
    expect(request.requiresApprovalSnapshot).toBe(true);
  });

  it("deixa material não controlado pronto para atendimento, ainda sem baixar saldo", async () => {
    const product = await createProduct();

    const request = await createWithdrawalRequest(requesterUserId, {
      productId: product.id,
      quantity: "3",
      departmentId,
    });

    expect(request.status).toBe("APPROVED");
    expect(request.requiresApprovalSnapshot).toBe(false);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("rejeita equipamento pertencente a outro setor", async () => {
    const product = await createProduct();
    const otherDepartment = await prisma.department.create({
      data: { code: "PROD", name: "Produção" },
    });
    const otherEquipment = await prisma.equipment.create({
      data: {
        departmentId: otherDepartment.id,
        code: "REB-01",
        name: "Rebobinadeira 01",
      },
    });

    await expect(
      createWithdrawalRequest(requesterUserId, {
        productId: product.id,
        quantity: "1",
        departmentId,
        equipmentId: otherEquipment.id,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "INVALID_WITHDRAWAL_DESTINATION",
        status: 400,
      }),
    );
  });
});
