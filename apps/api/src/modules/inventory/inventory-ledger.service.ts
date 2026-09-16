import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { writeAuditLog } from "../audit/audit.service.js";
import {
  postInventoryMovementSchema,
  type ParsedInventoryMovementInput,
  type PostInventoryMovementInput,
} from "./inventory.schemas.js";

const inboundTypes = new Set([
  "ENTRY",
  "RETURN",
  "ADJUSTMENT_IN",
  "INVENTORY_GAIN",
]);
const outboundTypes = new Set([
  "WITHDRAWAL",
  "ADJUSTMENT_OUT",
  "INVENTORY_LOSS",
]);

function notFound(message: string) {
  return new DomainError("NOT_FOUND", 404, message);
}

function auditAction(type: ParsedInventoryMovementInput["type"]) {
  if (type === "ENTRY") return "INVENTORY_ENTRY";
  if (type === "TRANSFER") return "INVENTORY_TRANSFER";
  if (
    type === "ADJUSTMENT_IN" ||
    type === "ADJUSTMENT_OUT" ||
    type === "INVENTORY_GAIN" ||
    type === "INVENTORY_LOSS"
  ) {
    return "INVENTORY_ADJUSTMENT";
  }
  if (type === "RETURN") return "INVENTORY_RETURN";
  if (type === "WITHDRAWAL") return "INVENTORY_WITHDRAWAL";
  return "INVENTORY_MOVEMENT";
}

async function loadMovementContext(
  tx: Prisma.TransactionClient,
  productId: string,
  locationIds: string[],
) {
  const product = await tx.product.findFirst({
    where: { id: productId, active: true },
    select: { id: true, trackingMode: true },
  });
  if (!product) throw notFound("Produto não encontrado ou inativo");

  const uniqueLocationIds = [...new Set(locationIds)];
  for (const locationId of uniqueLocationIds) {
    const location = await tx.storageLocation.findFirst({
      where: { id: locationId, active: true },
      include: { warehouse: { select: { id: true, active: true } } },
    });
    if (!location) throw notFound("Localização não encontrada ou inativa");
    if (!location.warehouse.active) {
      throw notFound("Almoxarifado não encontrado ou inativo");
    }
    if (location.kind !== "POSITION") {
      throw new DomainError(
        "INVALID_STOCK_LOCATION",
        400,
        "Estoque só pode ser movimentado em posições físicas",
      );
    }

    const association = await tx.productLocation.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      select: { id: true },
    });
    if (!association) {
      throw new DomainError(
        "PRODUCT_LOCATION_REQUIRED",
        409,
        "O produto precisa estar associado à posição antes de movimentar estoque",
        { productId, locationId },
      );
    }
  }

  return product;
}

function trackingRequired(message: string) {
  return new DomainError("TRACKING_REQUIRED", 400, message);
}

function trackingNotFound(kind: "lote" | "serial", value: string) {
  return new DomainError(
    "TRACKING_NOT_FOUND",
    404,
    `${kind === "lote" ? "Lote" : "Serial"} não encontrado para o produto`,
    { kind, value },
  );
}

async function resolveTracking(
  tx: Prisma.TransactionClient,
  product: { id: string; trackingMode: string },
  tracking: ParsedInventoryMovementInput["tracking"],
  quantity: Prisma.Decimal,
  isInbound: boolean,
) {
  if (product.trackingMode === "NONE") {
    if (tracking?.lotCode || tracking?.serialNumber || tracking?.expiresAt) {
      throw new DomainError(
        "TRACKING_NOT_ALLOWED",
        400,
        "Este produto não utiliza lote, serial ou validade",
      );
    }

    return {
      stockKey: "NONE",
      lotId: null as string | null,
      serialItemId: null as string | null,
    };
  }

  const isLot =
    product.trackingMode === "LOT" || product.trackingMode === "LOT_EXPIRY";
  const isSerial =
    product.trackingMode === "SERIAL" ||
    product.trackingMode === "SERIAL_EXPIRY";
  const requiresExpiry =
    product.trackingMode === "LOT_EXPIRY" ||
    product.trackingMode === "SERIAL_EXPIRY";

  if (isLot) {
    if (!tracking?.lotCode) {
      throw trackingRequired("Código do lote é obrigatório para este produto");
    }
    if (tracking.serialNumber) {
      throw new DomainError(
        "INVALID_TRACKING_DATA",
        400,
        "Produto rastreado por lote não aceita número de série",
      );
    }
    if (!requiresExpiry && tracking.expiresAt) {
      throw new DomainError(
        "TRACKING_EXPIRY_NOT_ALLOWED",
        400,
        "Este modo de rastreabilidade não utiliza validade",
      );
    }

    const lotCode = tracking.lotCode.trim().toUpperCase();
    let lot = await tx.inventoryLot.findUnique({
      where: {
        productId_lotCode: {
          productId: product.id,
          lotCode,
        },
      },
    });

    if (!lot) {
      if (!isInbound) throw trackingNotFound("lote", lotCode);
      if (requiresExpiry && !tracking.expiresAt) {
        throw new DomainError(
          "TRACKING_EXPIRY_REQUIRED",
          400,
          "Validade é obrigatória ao criar este lote",
        );
      }
      lot = await tx.inventoryLot.create({
        data: {
          productId: product.id,
          lotCode,
          ...(tracking.expiresAt ? { expiresAt: tracking.expiresAt } : {}),
        },
      });
    } else if (
      tracking.expiresAt &&
      lot.expiresAt &&
      lot.expiresAt.getTime() !== tracking.expiresAt.getTime()
    ) {
      throw new DomainError(
        "TRACKING_EXPIRY_MISMATCH",
        409,
        "A validade informada diverge da validade cadastrada para o lote",
      );
    }

    return {
      stockKey: `LOT:${lot.id}`,
      lotId: lot.id,
      serialItemId: null as string | null,
    };
  }

  if (isSerial) {
    if (!tracking?.serialNumber) {
      throw trackingRequired("Número de série é obrigatório para este produto");
    }
    if (tracking.lotCode) {
      throw new DomainError(
        "INVALID_TRACKING_DATA",
        400,
        "Produto serializado não aceita código de lote",
      );
    }
    if (!quantity.equals(1)) {
      throw new DomainError(
        "SERIAL_QUANTITY_MUST_BE_ONE",
        400,
        "Movimentações de produto serializado devem ter quantidade igual a 1",
      );
    }
    if (!requiresExpiry && tracking.expiresAt) {
      throw new DomainError(
        "TRACKING_EXPIRY_NOT_ALLOWED",
        400,
        "Este modo de rastreabilidade não utiliza validade",
      );
    }

    let serial = await tx.serialItem.findUnique({
      where: {
        productId_serialNumber: {
          productId: product.id,
          serialNumber: tracking.serialNumber,
        },
      },
    });

    if (!serial) {
      if (!isInbound) throw trackingNotFound("serial", tracking.serialNumber);
      if (requiresExpiry && !tracking.expiresAt) {
        throw new DomainError(
          "TRACKING_EXPIRY_REQUIRED",
          400,
          "Validade é obrigatória ao criar este item serializado",
        );
      }
      serial = await tx.serialItem.create({
        data: {
          productId: product.id,
          serialNumber: tracking.serialNumber,
          ...(tracking.expiresAt ? { expiresAt: tracking.expiresAt } : {}),
        },
      });
    } else {
      if (
        tracking.expiresAt &&
        serial.expiresAt &&
        serial.expiresAt.getTime() !== tracking.expiresAt.getTime()
      ) {
        throw new DomainError(
          "TRACKING_EXPIRY_MISMATCH",
          409,
          "A validade informada diverge da validade cadastrada para o serial",
        );
      }

      if (isInbound) {
        const positiveBalance = await tx.inventoryBalance.findFirst({
          where: {
            serialItemId: serial.id,
            quantity: { gt: 0 },
          },
          select: { locationId: true },
        });
        if (positiveBalance) {
          throw new DomainError(
            "SERIAL_ALREADY_IN_STOCK",
            409,
            "O serial já possui saldo positivo em outra posição",
            {
              serialNumber: tracking.serialNumber,
              locationId: positiveBalance.locationId,
            },
          );
        }
      }
    }

    return {
      stockKey: `SERIAL:${serial.id}`,
      lotId: null as string | null,
      serialItemId: serial.id,
    };
  }

  throw new DomainError(
    "INVALID_TRACKING_MODE",
    500,
    "Modo de rastreabilidade do produto não reconhecido",
  );
}

async function applyBalanceDelta(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    locationId: string;
    stockKey: string;
    lotId: string | null;
    serialItemId: string | null;
    delta: Prisma.Decimal;
  },
) {
  const existing = await tx.inventoryBalance.findUnique({
    where: {
      productId_locationId_stockKey: {
        productId: input.productId,
        locationId: input.locationId,
        stockKey: input.stockKey,
      },
    },
  });

  const current = existing?.quantity ?? new Prisma.Decimal(0);
  const next = current.plus(input.delta);
  if (next.lessThan(0)) {
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      409,
      "Saldo insuficiente para concluir a movimentação",
      {
        productId: input.productId,
        locationId: input.locationId,
        available: current.toString(),
        requested: input.delta.abs().toString(),
      },
    );
  }

  if (existing) {
    return tx.inventoryBalance.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  }

  if (input.delta.lessThan(0)) {
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      409,
      "Saldo insuficiente para concluir a movimentação",
    );
  }

  return tx.inventoryBalance.create({
    data: {
      productId: input.productId,
      locationId: input.locationId,
      lotId: input.lotId,
      serialItemId: input.serialItemId,
      stockKey: input.stockKey,
      quantity: next,
    },
  });
}

async function applyInboundValuation(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: Prisma.Decimal,
  requestedUnitCost: Prisma.Decimal | null,
) {
  const existing = await tx.inventoryValuation.findUnique({
    where: { productId },
  });
  const currentQuantity = existing?.quantity ?? new Prisma.Decimal(0);
  const currentTotalValue = existing?.totalValue ?? new Prisma.Decimal(0);
  const effectiveUnitCost =
    requestedUnitCost ?? existing?.averageUnitCost ?? new Prisma.Decimal(0);
  const nextQuantity = currentQuantity.plus(quantity);
  const nextTotalValue = currentTotalValue.plus(
    effectiveUnitCost.times(quantity),
  );
  const nextAverageUnitCost = nextTotalValue.dividedBy(nextQuantity);

  if (existing) {
    await tx.inventoryValuation.update({
      where: { productId },
      data: {
        quantity: nextQuantity,
        averageUnitCost: nextAverageUnitCost,
        totalValue: nextTotalValue,
      },
    });
  } else {
    await tx.inventoryValuation.create({
      data: {
        productId,
        quantity: nextQuantity,
        averageUnitCost: nextAverageUnitCost,
        totalValue: nextTotalValue,
      },
    });
  }

  return effectiveUnitCost;
}

async function loadCurrentAverageUnitCost(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const valuation = await tx.inventoryValuation.findUnique({
    where: { productId },
  });
  if (!valuation) {
    throw new DomainError(
      "INVENTORY_VALUATION_MISSING",
      409,
      "A valorização do produto não foi inicializada",
      { productId },
    );
  }

  return valuation.averageUnitCost;
}

async function applyOutboundValuation(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: Prisma.Decimal,
) {
  const valuation = await tx.inventoryValuation.findUnique({
    where: { productId },
  });
  if (!valuation || valuation.quantity.lessThan(quantity)) {
    throw new DomainError(
      "INVENTORY_VALUATION_INCONSISTENT",
      409,
      "A valorização do produto está inconsistente com o saldo físico",
      { productId },
    );
  }

  const unitCost = valuation.averageUnitCost;
  const nextQuantity = valuation.quantity.minus(quantity);
  const nextTotalValue = valuation.totalValue.minus(unitCost.times(quantity));
  const isEmpty = nextQuantity.equals(0);

  await tx.inventoryValuation.update({
    where: { productId },
    data: {
      quantity: nextQuantity,
      averageUnitCost: isEmpty ? new Prisma.Decimal(0) : unitCost,
      totalValue: isEmpty ? new Prisma.Decimal(0) : nextTotalValue,
    },
  });

  return unitCost;
}

export async function postInventoryMovementInTx(
  tx: Prisma.TransactionClient,
  actorUserId: string | null,
  input: PostInventoryMovementInput,
) {
  const parsed = postInventoryMovementSchema.parse(input);
  const locationIds = [parsed.fromLocationId, parsed.toLocationId].filter(
    (value): value is string => Boolean(value),
  );
  const product = await loadMovementContext(tx, parsed.productId, locationIds);
  const quantity = new Prisma.Decimal(parsed.quantity);
  const tracking = await resolveTracking(
    tx,
    product,
    parsed.tracking,
    quantity,
    inboundTypes.has(parsed.type),
  );
  let unitCost =
    parsed.unitCost !== undefined ? new Prisma.Decimal(parsed.unitCost) : null;

  if (inboundTypes.has(parsed.type) && parsed.toLocationId) {
    if (parsed.type === "ENTRY" && unitCost === null) {
      throw new DomainError(
        "UNIT_COST_REQUIRED",
        400,
        "Custo unitário é obrigatório em entradas",
      );
    }
    await applyBalanceDelta(tx, {
      productId: parsed.productId,
      locationId: parsed.toLocationId,
      ...tracking,
      delta: quantity,
    });
    unitCost = await applyInboundValuation(
      tx,
      parsed.productId,
      quantity,
      unitCost,
    );
  } else if (outboundTypes.has(parsed.type) && parsed.fromLocationId) {
    await applyBalanceDelta(tx, {
      productId: parsed.productId,
      locationId: parsed.fromLocationId,
      ...tracking,
      delta: quantity.negated(),
    });
    unitCost = await applyOutboundValuation(tx, parsed.productId, quantity);
  } else if (
    parsed.type === "TRANSFER" &&
    parsed.fromLocationId &&
    parsed.toLocationId
  ) {
    await applyBalanceDelta(tx, {
      productId: parsed.productId,
      locationId: parsed.fromLocationId,
      ...tracking,
      delta: quantity.negated(),
    });
    await applyBalanceDelta(tx, {
      productId: parsed.productId,
      locationId: parsed.toLocationId,
      ...tracking,
      delta: quantity,
    });
    unitCost = await loadCurrentAverageUnitCost(tx, parsed.productId);
  }

  const totalCost = unitCost ? unitCost.times(quantity) : null;

  const movement = await tx.stockMovement.create({
    data: {
      type: parsed.type,
      ...(parsed.reason ? { reason: parsed.reason } : {}),
      ...(parsed.reference ? { reference: parsed.reference } : {}),
      ...(actorUserId ? { performedByUserId: actorUserId } : {}),
      items: {
        create: {
          productId: parsed.productId,
          ...(parsed.fromLocationId
            ? { fromLocationId: parsed.fromLocationId }
            : {}),
          ...(parsed.toLocationId ? { toLocationId: parsed.toLocationId } : {}),
          ...(tracking.lotId ? { lotId: tracking.lotId } : {}),
          ...(tracking.serialItemId
            ? { serialItemId: tracking.serialItemId }
            : {}),
          quantity,
          ...(unitCost ? { unitCost, totalCost } : {}),
        },
      },
    },
    include: { items: true },
  });

  await writeAuditLog(tx, {
    actorUserId,
    action: auditAction(parsed.type),
    entityType: "StockMovement",
    entityId: movement.id,
    after: {
      type: parsed.type,
      productId: parsed.productId,
      quantity: parsed.quantity,
      fromLocationId: parsed.fromLocationId ?? null,
      toLocationId: parsed.toLocationId ?? null,
      reason: parsed.reason ?? null,
      reference: parsed.reference ?? null,
    },
  });

  return { movement };
}

export async function postInventoryMovement(
  actorUserId: string | null,
  input: PostInventoryMovementInput,
) {
  try {
    return await prisma.$transaction(
      (tx) => postInventoryMovementInTx(tx, actorUserId, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new DomainError(
        "CONCURRENT_STOCK_UPDATE",
        409,
        "O estoque foi alterado por outra operação. Tente novamente",
      );
    }
    throw error;
  }
}
