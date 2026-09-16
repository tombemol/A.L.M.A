import type { Prisma } from "@prisma/client";
import { prisma } from "@alma/database";
import type { AuditListQuery } from "./audit.schemas.js";

export type AuditEvent = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  context?: Prisma.InputJsonValue | null;
};

type AuditClient = typeof prisma | Prisma.TransactionClient;

export async function writeAuditLog(client: AuditClient, event: AuditEvent) {
  return client.auditLog.create({
    data: {
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      before: event.before ?? undefined,
      after: event.after ?? undefined,
      context: event.context ?? undefined,
    },
  });
}

export async function listAuditLogs(query: AuditListQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            employeeCode: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
