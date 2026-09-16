import { Prisma } from "@alma/database";
import { z } from "zod";

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

export const createWithdrawalRequestSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: positiveDecimalSchema,
  departmentId: z.string().min(1, "Setor é obrigatório"),
  equipmentId: z.string().min(1).optional(),
  workOrderId: z.string().min(1).optional(),
  fromLocationId: z.string().min(1).optional(),
  notes: z.string().trim().min(1).max(1000).optional(),
});

export type CreateWithdrawalRequestInput = z.input<
  typeof createWithdrawalRequestSchema
>;
