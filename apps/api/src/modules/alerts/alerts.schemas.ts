import { z } from "zod";

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0 && !Number.isNaN(Number(value)), "Valor numérico inválido")
  .refine((value) => Number(value) >= 0, "Valor não pode ser negativo");

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1),
});

export const reorderPolicySchema = z
  .object({
    minimumStock: decimalString.nullable().optional(),
    maximumStock: decimalString.nullable().optional(),
    reorderPoint: decimalString.nullable().optional(),
    expiryWarningDays: z.coerce.number().int().min(1).max(365).default(30),
  })
  .superRefine((value, ctx) => {
    const minimum = value.minimumStock == null ? null : Number(value.minimumStock);
    const maximum = value.maximumStock == null ? null : Number(value.maximumStock);
    const reorder = value.reorderPoint == null ? null : Number(value.reorderPoint);

    if (minimum != null && maximum != null && minimum > maximum) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Estoque mínimo não pode superar o máximo", path: ["minimumStock"] });
    }

    if (reorder != null && maximum != null && reorder > maximum) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ponto de reposição não pode superar o máximo", path: ["reorderPoint"] });
    }
  });

export const alertListQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  type: z.enum(["REORDER", "BELOW_MINIMUM", "STOCKOUT", "EXPIRY_NEAR", "EXPIRED", "FRAGMENTATION"]).optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ReorderPolicyInput = z.infer<typeof reorderPolicySchema>;
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;
