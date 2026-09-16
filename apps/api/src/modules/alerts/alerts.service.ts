import {
  Prisma,
  prisma,
  type AlertSeverity,
  type AlertType,
} from "@alma/database";
import { DomainError } from "@alma/shared";
import { writeAuditLog } from "../audit/audit.service.js";
import type { AlertListQuery, ReorderPolicyInput } from "./alerts.schemas.js";

type DesiredAlert = {
  productId: string;
  type: AlertType;
  severity: AlertSeverity;
  activeKey: string;
  message: string;
  details?: Prisma.InputJsonValue;
};

function activeKey(type: AlertType, productId: string) {
  return `${type}:${productId}`;
}

function decimal(value: string | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

export async function getReorderPolicy(productId: string) {
  return prisma.reorderPolicy.findUnique({ where: { productId } });
}

export async function upsertReorderPolicy(
  productId: string,
  input: ReorderPolicyInput,
  actorUserId: string,
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new DomainError("PRODUCT_NOT_FOUND", 404, "Produto não encontrado");
  }

  const before = await prisma.reorderPolicy.findUnique({ where: { productId } });
  const data = {
    minimumStock: decimal(input.minimumStock),
    maximumStock: decimal(input.maximumStock),
    reorderPoint: decimal(input.reorderPoint),
    expiryWarningDays: input.expiryWarningDays,
  };

  return prisma.$transaction(async (tx) => {
    const policy = await tx.reorderPolicy.upsert({
      where: { productId },
      update: data,
      create: { productId, ...data },
    });

    await writeAuditLog(tx, {
      actorUserId,
      action: "REORDER_POLICY_UPDATED",
      entityType: "ReorderPolicy",
      entityId: policy.id,
      before: before
        ? {
            minimumStock: before.minimumStock?.toString() ?? null,
            maximumStock: before.maximumStock?.toString() ?? null,
            reorderPoint: before.reorderPoint?.toString() ?? null,
            expiryWarningDays: before.expiryWarningDays,
          }
        : null,
      after: {
        productId,
        minimumStock: policy.minimumStock?.toString() ?? null,
        maximumStock: policy.maximumStock?.toString() ?? null,
        reorderPoint: policy.reorderPoint?.toString() ?? null,
        expiryWarningDays: policy.expiryWarningDays,
      },
    });

    return policy;
  });
}

export async function listAlerts(query: AlertListQuery) {
  const where: Prisma.AlertWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.active === true ? { resolvedAt: null } : {}),
    ...(query.active === false ? { resolvedAt: { not: null } } : {}),
  };

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
      orderBy: [{ resolvedAt: "asc" }, { severity: "desc" }, { lastDetectedAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function evaluateAlerts(options?: {
  now?: Date;
  actorUserId?: string | null;
}) {
  const now = options?.now ?? new Date();
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      reorderPolicy: true,
      inventoryBalances: {
        where: { quantity: { gt: 0 } },
        include: { lot: true, serialItem: true },
      },
    },
  });

  const desired: DesiredAlert[] = [];

  for (const product of products) {
    const total = product.inventoryBalances.reduce(
      (sum, balance) => sum.plus(balance.quantity),
      new Prisma.Decimal(0),
    );
    const locations = new Set(product.inventoryBalances.map((balance) => balance.locationId));
    const policy = product.reorderPolicy;

    if (total.lte(0)) {
      desired.push({
        productId: product.id,
        type: "STOCKOUT",
        severity: "CRITICAL",
        activeKey: activeKey("STOCKOUT", product.id),
        message: `${product.sku} está sem saldo disponível`,
        details: { totalQuantity: total.toString() },
      });
    } else {
      if (policy?.minimumStock && total.lt(policy.minimumStock)) {
        desired.push({
          productId: product.id,
          type: "BELOW_MINIMUM",
          severity: "CRITICAL",
          activeKey: activeKey("BELOW_MINIMUM", product.id),
          message: `${product.sku} está abaixo do estoque mínimo`,
          details: {
            totalQuantity: total.toString(),
            minimumStock: policy.minimumStock.toString(),
          },
        });
      }

      if (policy?.reorderPoint && total.lte(policy.reorderPoint)) {
        desired.push({
          productId: product.id,
          type: "REORDER",
          severity: "WARNING",
          activeKey: activeKey("REORDER", product.id),
          message: `${product.sku} atingiu o ponto de reposição`,
          details: {
            totalQuantity: total.toString(),
            reorderPoint: policy.reorderPoint.toString(),
          },
        });
      }
    }

    if (locations.size > 1) {
      desired.push({
        productId: product.id,
        type: "FRAGMENTATION",
        severity: "INFO",
        activeKey: activeKey("FRAGMENTATION", product.id),
        message: `${product.sku} está distribuído em ${locations.size} posições`,
        details: { positiveLocations: locations.size },
      });
    }

    const expiryWarningDays = policy?.expiryWarningDays ?? 30;
    const warningLimit = new Date(now.getTime() + expiryWarningDays * 86_400_000);
    let expiredCount = 0;
    let nearExpiryCount = 0;

    for (const balance of product.inventoryBalances) {
      const expiresAt = balance.lot?.expiresAt ?? balance.serialItem?.expiresAt ?? null;
      if (!expiresAt) continue;
      if (expiresAt <= now) expiredCount += 1;
      else if (expiresAt <= warningLimit) nearExpiryCount += 1;
    }

    if (expiredCount > 0) {
      desired.push({
        productId: product.id,
        type: "EXPIRED",
        severity: "CRITICAL",
        activeKey: activeKey("EXPIRED", product.id),
        message: `${product.sku} possui ${expiredCount} saldo(s) vencido(s)`,
        details: { expiredCount },
      });
    }

    if (nearExpiryCount > 0) {
      desired.push({
        productId: product.id,
        type: "EXPIRY_NEAR",
        severity: "WARNING",
        activeKey: activeKey("EXPIRY_NEAR", product.id),
        message: `${product.sku} possui ${nearExpiryCount} saldo(s) próximo(s) da validade`,
        details: { nearExpiryCount, expiryWarningDays },
      });
    }
  }

  const desiredKeys = new Set(desired.map((alert) => alert.activeKey));

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.alert.findMany({
      where: { resolvedAt: null, activeKey: { not: null } },
      select: { id: true, activeKey: true },
    });

    let resolved = 0;
    for (const alert of current) {
      if (alert.activeKey && !desiredKeys.has(alert.activeKey)) {
        await tx.alert.update({
          where: { id: alert.id },
          data: { activeKey: null, resolvedAt: now },
        });
        resolved += 1;
      }
    }

    let created = 0;
    let refreshed = 0;
    for (const alert of desired) {
      const existing = await tx.alert.findUnique({ where: { activeKey: alert.activeKey } });
      if (existing) {
        await tx.alert.update({
          where: { id: existing.id },
          data: {
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            lastDetectedAt: now,
          },
        });
        refreshed += 1;
      } else {
        await tx.alert.create({
          data: {
            ...alert,
            detectedAt: now,
            lastDetectedAt: now,
          },
        });
        created += 1;
      }
    }

    await writeAuditLog(tx, {
      actorUserId: options?.actorUserId ?? null,
      action: "ALERTS_EVALUATED",
      entityType: "AlertEvaluation",
      context: { created, refreshed, resolved, active: desired.length },
    });

    return { created, refreshed, resolved, active: desired.length };
  });

  return result;
}
