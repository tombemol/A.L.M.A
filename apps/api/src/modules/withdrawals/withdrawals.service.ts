import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { postInventoryMovementInTx } from "../inventory/inventory-ledger.service.js";
import {
  createWithdrawalRequestSchema,
  directWithdrawalSchema,
  fulfillWithdrawalRequestSchema,
  type CreateWithdrawalRequestInput,
  type DirectWithdrawalInput,
  type FulfillWithdrawalRequestInput,
  type WithdrawalListQuery,
} from "./withdrawals.schemas.js";

const actorSelect = {
  id: true,
  employeeCode: true,
  username: true,
  displayName: true,
} satisfies Prisma.UserSelect;

const withdrawalInclude = {
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      trackingMode: true,
      requiresWithdrawalApproval: true,
      baseUnit: true,
      category: {
        select: {
          id: true,
          code: true,
          name: true,
          requiresWithdrawalApproval: true,
        },
      },
    },
  },
  requester: { select: actorSelect },
  fulfilledBy: { select: actorSelect },
  department: true,
  equipment: true,
  workOrder: true,
  fromLocation: { include: { warehouse: true } },
  approval: {
    include: { decidedBy: { select: actorSelect } },
  },
  stockMovement: {
    include: {
      performedBy: { select: actorSelect },
      items: {
        include: {
          fromLocation: true,
          toLocation: true,
          lot: true,
          serialItem: true,
        },
      },
    },
  },
} satisfies Prisma.WithdrawalRequestInclude;

type ParsedWithdrawalBase = {
  productId: string;
  quantity: string;
  departmentId: string;
  equipmentId?: string;
  workOrderId?: string;
  fromLocationId?: string;
  notes?: string;
};

function notFound(message: string) {
  return new DomainError("NOT_FOUND", 404, message);
}

function invalidDestination(message: string) {
  return new DomainError("INVALID_WITHDRAWAL_DESTINATION", 400, message);
}

function concurrentStockUpdate() {
  return new DomainError(
    "CONCURRENT_STOCK_UPDATE",
    409,
    "O estoque foi alterado por outra operação. Tente novamente",
  );
}

async function validateWithdrawalContext(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  input: ParsedWithdrawalBase,
) {
  const actor = await tx.user.findFirst({
    where: { id: actorUserId, active: true },
    select: { id: true },
  });
  if (!actor) throw notFound("Usuário não encontrado ou inativo");

  const product = await tx.product.findFirst({
    where: { id: input.productId, active: true },
    select: {
      id: true,
      requiresWithdrawalApproval: true,
      category: {
        select: {
          id: true,
          active: true,
          requiresWithdrawalApproval: true,
        },
      },
    },
  });
  if (!product || !product.category.active) {
    throw notFound("Produto não encontrado ou inativo");
  }

  const department = await tx.department.findFirst({
    where: { id: input.departmentId, active: true },
    select: { id: true },
  });
  if (!department) throw notFound("Setor não encontrado ou inativo");

  if (input.equipmentId) {
    const equipment = await tx.equipment.findFirst({
      where: { id: input.equipmentId, active: true },
      select: { id: true, departmentId: true },
    });
    if (!equipment) throw notFound("Equipamento não encontrado ou inativo");
    if (equipment.departmentId !== input.departmentId) {
      throw invalidDestination(
        "O equipamento informado não pertence ao setor selecionado",
      );
    }
  }

  if (input.workOrderId) {
    const workOrder = await tx.workOrder.findFirst({
      where: { id: input.workOrderId, active: true },
      select: { id: true, departmentId: true, equipmentId: true },
    });
    if (!workOrder) throw notFound("Ordem de serviço não encontrada ou inativa");
    if (workOrder.departmentId !== input.departmentId) {
      throw invalidDestination(
        "A ordem de serviço não pertence ao setor selecionado",
      );
    }
    if (
      input.equipmentId &&
      workOrder.equipmentId &&
      workOrder.equipmentId !== input.equipmentId
    ) {
      throw invalidDestination("A ordem de serviço pertence a outro equipamento");
    }
  }

  if (input.fromLocationId) {
    const location = await tx.storageLocation.findFirst({
      where: { id: input.fromLocationId, active: true },
      include: { warehouse: { select: { active: true } } },
    });
    if (!location || !location.warehouse.active) {
      throw notFound("Localização de origem não encontrada ou inativa");
    }
    if (location.kind !== "POSITION") {
      throw invalidDestination("A origem da retirada precisa ser uma posição física");
    }
    const association = await tx.productLocation.findUnique({
      where: {
        productId_locationId: {
          productId: input.productId,
          locationId: input.fromLocationId,
        },
      },
      select: { id: true },
    });
    if (!association) {
      throw new DomainError(
        "PRODUCT_LOCATION_REQUIRED",
        409,
        "O produto precisa estar associado à posição escolhida",
      );
    }
  }

  return {
    requiresApproval:
      product.requiresWithdrawalApproval ||
      product.category.requiresWithdrawalApproval,
  };
}

async function createWithdrawalRecordInTx(
  tx: Prisma.TransactionClient,
  requesterUserId: string,
  input: ParsedWithdrawalBase,
  requiresApproval: boolean,
) {
  return tx.withdrawalRequest.create({
    data: {
      productId: input.productId,
      quantity: new Prisma.Decimal(input.quantity),
      requesterUserId,
      departmentId: input.departmentId,
      ...(input.equipmentId ? { equipmentId: input.equipmentId } : {}),
      ...(input.workOrderId ? { workOrderId: input.workOrderId } : {}),
      ...(input.fromLocationId ? { fromLocationId: input.fromLocationId } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      requiresApprovalSnapshot: requiresApproval,
      status: requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
    },
  });
}

export async function createWithdrawalRequest(
  requesterUserId: string,
  input: CreateWithdrawalRequestInput,
) {
  const parsed = createWithdrawalRequestSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const context = await validateWithdrawalContext(tx, requesterUserId, parsed);
    return createWithdrawalRecordInTx(
      tx,
      requesterUserId,
      parsed,
      context.requiresApproval,
    );
  });
}

async function decideWithdrawalRequest(
  decidedByUserId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) {
  const normalizedComment = comment?.trim();
  if (normalizedComment && normalizedComment.length > 1000) {
    throw new DomainError(
      "VALIDATION_ERROR",
      400,
      "Comentário deve ter no máximo 1000 caracteres",
    );
  }

  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findFirst({
      where: { id: decidedByUserId, active: true },
      select: { id: true },
    });
    if (!actor) throw notFound("Aprovador não encontrado ou inativo");

    const existing = await tx.withdrawalRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, requiresApprovalSnapshot: true },
    });
    if (!existing) throw notFound("Solicitação de retirada não encontrada");
    if (!existing.requiresApprovalSnapshot) {
      throw new DomainError(
        "WITHDRAWAL_APPROVAL_NOT_REQUIRED",
        409,
        "Esta solicitação não exige decisão de aprovação",
      );
    }

    const claimed = await tx.withdrawalRequest.updateMany({
      where: { id: requestId, status: "PENDING_APPROVAL" },
      data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED" },
    });
    if (claimed.count !== 1) {
      throw new DomainError(
        "WITHDRAWAL_ALREADY_DECIDED",
        409,
        "A solicitação já foi decidida ou não está mais pendente",
        { currentStatus: existing.status },
      );
    }

    await tx.approval.create({
      data: {
        withdrawalRequestId: requestId,
        decision,
        decidedByUserId,
        ...(normalizedComment ? { comment: normalizedComment } : {}),
      },
    });

    return tx.withdrawalRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  });
}

export function approveWithdrawalRequest(
  decidedByUserId: string,
  requestId: string,
  comment?: string,
) {
  return decideWithdrawalRequest(
    decidedByUserId,
    requestId,
    "APPROVED",
    comment,
  );
}

export function rejectWithdrawalRequest(
  decidedByUserId: string,
  requestId: string,
  comment?: string,
) {
  return decideWithdrawalRequest(
    decidedByUserId,
    requestId,
    "REJECTED",
    comment,
  );
}

export async function fulfillWithdrawalRequest(
  fulfilledByUserId: string,
  requestId: string,
  input: FulfillWithdrawalRequestInput,
) {
  const parsed = fulfillWithdrawalRequestSchema.parse(input);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const actor = await tx.user.findFirst({
          where: { id: fulfilledByUserId, active: true },
          select: { id: true },
        });
        if (!actor) throw notFound("Almoxarife não encontrado ou inativo");

        const existing = await tx.withdrawalRequest.findUnique({
          where: { id: requestId },
        });
        if (!existing) throw notFound("Solicitação de retirada não encontrada");

        if (existing.status === "FULFILLED") {
          if (!existing.stockMovementId) {
            throw new DomainError(
              "WITHDRAWAL_HISTORY_INCONSISTENT",
              409,
              "A retirada está concluída sem movimentação de estoque associada",
            );
          }
          const movement = await tx.stockMovement.findUnique({
            where: { id: existing.stockMovementId },
            include: { items: true },
          });
          if (!movement) {
            throw new DomainError(
              "WITHDRAWAL_HISTORY_INCONSISTENT",
              409,
              "A movimentação associada à retirada não foi encontrada",
            );
          }
          return { request: existing, movement };
        }

        if (existing.status !== "APPROVED") {
          throw new DomainError(
            "WITHDRAWAL_NOT_APPROVED",
            409,
            "Somente solicitações aprovadas podem ser atendidas",
            { currentStatus: existing.status },
          );
        }

        const claimed = await tx.withdrawalRequest.updateMany({
          where: { id: requestId, status: "APPROVED" },
          data: { status: "FULFILLING" },
        });
        if (claimed.count !== 1) {
          throw new DomainError(
            "WITHDRAWAL_FULFILLMENT_CONFLICT",
            409,
            "A solicitação está sendo atendida por outra operação",
          );
        }

        const { movement } = await postInventoryMovementInTx(
          tx,
          fulfilledByUserId,
          {
            type: "WITHDRAWAL",
            productId: existing.productId,
            fromLocationId: parsed.fromLocationId,
            quantity: existing.quantity.toString(),
            reference: `WITHDRAWAL:${existing.id}`,
            ...(parsed.tracking ? { tracking: parsed.tracking } : {}),
          },
        );

        const request = await tx.withdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: "FULFILLED",
            stockMovementId: movement.id,
            fulfilledByUserId,
            fulfilledAt: new Date(),
            fromLocationId: parsed.fromLocationId,
          },
        });

        return { request, movement };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw concurrentStockUpdate();
    }
    throw error;
  }
}

export async function createDirectWithdrawal(
  actorUserId: string,
  input: DirectWithdrawalInput,
) {
  const parsed = directWithdrawalSchema.parse(input);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const context = await validateWithdrawalContext(tx, actorUserId, parsed);
        if (context.requiresApproval) {
          throw new DomainError(
            "WITHDRAWAL_APPROVAL_REQUIRED",
            409,
            "Este material exige solicitação e aprovação antes da retirada",
          );
        }

        const request = await tx.withdrawalRequest.create({
          data: {
            productId: parsed.productId,
            quantity: new Prisma.Decimal(parsed.quantity),
            requesterUserId: actorUserId,
            departmentId: parsed.departmentId,
            ...(parsed.equipmentId ? { equipmentId: parsed.equipmentId } : {}),
            ...(parsed.workOrderId ? { workOrderId: parsed.workOrderId } : {}),
            fromLocationId: parsed.fromLocationId,
            ...(parsed.notes ? { notes: parsed.notes } : {}),
            requiresApprovalSnapshot: false,
            status: "FULFILLING",
          },
        });

        const { movement } = await postInventoryMovementInTx(tx, actorUserId, {
          type: "WITHDRAWAL",
          productId: parsed.productId,
          fromLocationId: parsed.fromLocationId,
          quantity: parsed.quantity,
          reference: `WITHDRAWAL_DIRECT:${request.id}`,
          ...(parsed.tracking ? { tracking: parsed.tracking } : {}),
        });

        const fulfilled = await tx.withdrawalRequest.update({
          where: { id: request.id },
          data: {
            status: "FULFILLED",
            stockMovementId: movement.id,
            fulfilledByUserId: actorUserId,
            fulfilledAt: new Date(),
          },
        });

        return { request: fulfilled, movement };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw concurrentStockUpdate();
    }
    throw error;
  }
}

export async function listWithdrawalRequests(query: WithdrawalListQuery) {
  const dateFilter =
    query.from || query.to
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        }
      : undefined;

  const where: Prisma.WithdrawalRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.requesterUserId
      ? { requesterUserId: query.requesterUserId }
      : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      include: withdrawalInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);

  return {
    requests,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getWithdrawalRequest(id: string) {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: withdrawalInclude,
  });
  if (!request) throw notFound("Solicitação de retirada não encontrada");
  return request;
}
