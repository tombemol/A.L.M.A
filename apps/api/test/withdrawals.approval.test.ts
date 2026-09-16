import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  approveWithdrawalRequest,
  createWithdrawalRequest,
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

describe("aprovação de retiradas", () => {
  let requesterUserId: string;
  let approverUserId: string;
  let productId: string;
  let departmentId: string;

  beforeEach(async () => {
    await resetTables();

    const [requester, approver] = await Promise.all([
      prisma.user.create({
        data: { employeeCode: "7101", displayName: "Solicitante" },
      }),
      prisma.user.create({
        data: { employeeCode: "7102", displayName: "Aprovador" },
      }),
    ]);
    const category = await prisma.category.create({
      data: { code: "CTRL", name: "Controlados" },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: { code: "UN", name: "Unidade", symbol: "un" },
    });
    const product = await prisma.product.create({
      data: {
        sku: "CTRL-001",
        name: "Material controlado",
        categoryId: category.id,
        baseUnitId: unit.id,
        requiresWithdrawalApproval: true,
      },
    });
    const department = await prisma.department.create({
      data: { code: "MAN", name: "Manutenção" },
    });

    requesterUserId = requester.id;
    approverUserId = approver.id;
    productId = product.id;
    departmentId = department.id;
  });

  afterEach(resetTables);

  async function pendingRequest() {
    return createWithdrawalRequest(requesterUserId, {
      productId,
      quantity: "2",
      departmentId,
    });
  }

  it("aprova sem movimentar estoque", async () => {
    const request = await pendingRequest();

    const approved = await approveWithdrawalRequest(
      approverUserId,
      request.id,
      "Necessidade confirmada",
    );

    expect(approved.status).toBe("APPROVED");
    expect(await prisma.approval.findUnique({
      where: { withdrawalRequestId: request.id },
    })).toEqual(
      expect.objectContaining({
        decision: "APPROVED",
        decidedByUserId: approverUserId,
        comment: "Necessidade confirmada",
      }),
    );
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("rejeita sem movimentar estoque", async () => {
    const request = await pendingRequest();

    const rejected = await rejectWithdrawalRequest(
      approverUserId,
      request.id,
      "Solicitação duplicada",
    );

    expect(rejected.status).toBe("REJECTED");
    expect(await prisma.approval.findUnique({
      where: { withdrawalRequestId: request.id },
    })).toEqual(
      expect.objectContaining({ decision: "REJECTED" }),
    );
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("não permite decidir a mesma solicitação duas vezes", async () => {
    const request = await pendingRequest();
    await approveWithdrawalRequest(approverUserId, request.id);

    await expect(
      rejectWithdrawalRequest(approverUserId, request.id, "Tarde demais"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "WITHDRAWAL_ALREADY_DECIDED",
        status: 409,
      }),
    );

    expect(await prisma.approval.count()).toBe(1);
  });
});
