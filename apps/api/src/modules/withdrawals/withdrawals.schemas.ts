import { Prisma } from "@alma/database";
import { z } from "zod";
import { inventoryTrackingInputSchema } from "../inventory/inventory.schemas.js";

function isPositiveDecimal(value: unknown) {
  try {
    const decimal = new Prisma.Decimal(String(value).trim());
    return decimal.isFinite() && decimal.greaterThan(0);
  } catch {
    return false;
  }
}

const positiveDecimalSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(isPositiveDecimal, "Quantidade deve ser maior que zero");

export const withdrawalRequestStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "FULFILLING",
  "FULFILLED",
  "CANCELLED",
]);

export const withdrawalRequestIdParamSchema = z.object({
  id: z.string().min(1, "Solicitação é obrigatória"),
});

export const createWithdrawalRequestSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: positiveDecimalSchema,
  departmentId: z.string().min(1, "Setor é obrigatório"),
  equipmentId: z.string().min(1).optional(),
  workOrderId: z.string().min(1).optional(),
  fromLocationId: z.string().min(1).optional(),
  notes: z.string().trim().min(1).max(1000).optional(),
});

export const fulfillWithdrawalRequestSchema = z.object({
  fromLocationId: z.string().min(1, "Localização de origem é obrigatória"),
  tracking: inventoryTrackingInputSchema.optional(),
});

export const directWithdrawalSchema = createWithdrawalRequestSchema
  .omit({ fromLocationId: true })
  .extend({
    fromLocationId: z.string().min(1, "Localização de origem é obrigatória"),
    tracking: inventoryTrackingInputSchema.optional(),
  });

export const withdrawalDecisionSchema = z.object({
  comment: z.string().trim().min(1).max(1000).optional(),
});

export const withdrawalListQuerySchema = z.object({
  status: withdrawalRequestStatusSchema.optional(),
  productId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  requesterUserId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateWithdrawalRequestInput = z.input<
  typeof createWithdrawalRequestSchema
>;
export type FulfillWithdrawalRequestInput = z.input<
  typeof fulfillWithdrawalRequestSchema
>;
export type DirectWithdrawalInput = z.input<typeof directWithdrawalSchema>;
export type WithdrawalListQuery = z.output<typeof withdrawalListQuerySchema>;
