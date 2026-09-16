import { z } from "zod";

export const auditListQuerySchema = z.object({
  actorUserId: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
