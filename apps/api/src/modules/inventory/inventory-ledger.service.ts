import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  postInventoryMovementSchema,
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

function resolveUntrackedStockKey(
  product: { trackingMode: string },
  tracking: PostInventoryMovementInput["tracking"],
) {
  if (product.trackingMode !== "NONE") {
    throw new DomainError(
      "TRACKING_REQUIRED",
      400,
      "O produto exige informações de rastreabilidade",
    );
  }
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

export async function postInventoryMovement(
  actorUserId: string | null,
  input: PostInventoryMovementInput,
) {
  const parsed = postInventoryMovementSchema.parse(input);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const locationIds = [parsed.fromLocationId, parsed.toLocationId].filter(
          (value): value is string => Boolean(value),
        );
        const product = await loadMovementContext(tx, parsed.productId, locationIds);
        const tracking = resolveUntrackedStockKey(product, parsed.tracking);
        const quantity = new Prisma.Decimal(parsed.quantity);
        let unitCost =
          parsed.unitCost !== undefined
            ? new Prisma.Decimal(parsed.unitCost)
            : null;

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
                ...(parsed.toLocationId
                  ? { toLocationId: parsed.toLocationId }
                  : {}),
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

        return { movement };
      },
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
