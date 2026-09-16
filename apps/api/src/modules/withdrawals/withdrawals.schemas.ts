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

const withdrawalRequestObjectSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: positiveDecimalSchema,
  departmentId: z.string().min(1, "Setor é obrigatório"),
  equipmentId: z.string().min(1).optional(),
  workOrderId: z.string().min(1).optional(),
  fromLocationId: z.string().min(1).optional(),
  notes: z.string().trim().min(1).max(1000).optional(),
});

type ParsedWithdrawalRequest = {
  productId: string;
  quantity: string;
  departmentId: string;
  equipmentId?: string;
  workOrderId?: string;
  fromLocationId?: string;
  notes?: string;
};

function normalizeWithdrawalRequest(
  input: z.output<typeof withdrawalRequestObjectSchema>,
): ParsedWithdrawalRequest {
  return {
    productId: input.productId,
    quantity: input.quantity,
    departmentId: input.departmentId,
    ...(input.equipmentId !== undefined ? { equipmentId: input.equipmentId } : {}),
    ...(input.workOrderId !== undefined ? { workOrderId: input.workOrderId } : {}),
    ...(input.fromLocationId !== undefined
      ? { fromLocationId: input.fromLocationId }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

export const createWithdrawalRequestSchema = withdrawalRequestObjectSchema.transform(
  normalizeWithdrawalRequest,
);

export const fulfillWithdrawalRequestSchema = z.object({
  fromLocationId: z.string().min(1, "Localização de origem é obrigatória"),
  tracking: inventoryTrackingInputSchema.optional(),
});

const directWithdrawalObjectSchema = withdrawalRequestObjectSchema
  .omit({ fromLocationId: true })
  .extend({
    fromLocationId: z.string().min(1, "Localização de origem é obrigatória"),
    tracking: inventoryTrackingInputSchema.optional(),
  });

type ParsedDirectWithdrawal = ParsedWithdrawalRequest & {
  fromLocationId: string;
  tracking?: z.output<typeof inventoryTrackingInputSchema>;
};

export const directWithdrawalSchema = directWithdrawalObjectSchema.transform(
  (input): ParsedDirectWithdrawal => ({
    productId: input.productId,
    quantity: input.quantity,
    departmentId: input.departmentId,
    fromLocationId: input.fromLocationId,
    ...(input.equipmentId !== undefined ? { equipmentId: input.equipmentId } : {}),
    ...(input.workOrderId !== undefined ? { workOrderId: input.workOrderId } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.tracking !== undefined ? { tracking: input.tracking } : {}),
  }),
);

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
