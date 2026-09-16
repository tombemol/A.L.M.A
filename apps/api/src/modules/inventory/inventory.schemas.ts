import { Prisma } from "@alma/database";
import { z } from "zod";

function decimalString(value: unknown, allowZero: boolean) {
  try {
    const decimal = new Prisma.Decimal(String(value).trim());
    if (!decimal.isFinite()) return false;
    return allowZero ? decimal.greaterThanOrEqualTo(0) : decimal.greaterThan(0);
  } catch {
    return false;
  }
}

const positiveDecimalSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => decimalString(value, false), "Quantidade deve ser maior que zero");

const nonNegativeDecimalSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => decimalString(value, true), "Custo não pode ser negativo");

export const stockMovementTypeSchema = z.enum([
  "ENTRY",
  "WITHDRAWAL",
  "RETURN",
  "TRANSFER",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "INVENTORY_GAIN",
  "INVENTORY_LOSS",
]);

export const adjustmentMovementTypeSchema = z.enum([
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "INVENTORY_GAIN",
  "INVENTORY_LOSS",
]);

export const inventoryTrackingInputSchema = z.object({
  lotCode: z.string().trim().min(1).max(120).optional(),
  serialNumber: z.string().trim().min(1).max(200).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const postInventoryMovementSchema = z
  .object({
    type: stockMovementTypeSchema,
    productId: z.string().min(1, "Produto é obrigatório"),
    fromLocationId: z.string().min(1).optional(),
    toLocationId: z.string().min(1).optional(),
    quantity: positiveDecimalSchema,
    unitCost: nonNegativeDecimalSchema.optional(),
    reason: z.string().trim().min(1).max(1000).optional(),
    reference: z.string().trim().min(1).max(200).optional(),
    tracking: inventoryTrackingInputSchema.optional(),
  })
  .superRefine((input, ctx) => {
    const inbound = ["ENTRY", "RETURN", "ADJUSTMENT_IN", "INVENTORY_GAIN"].includes(
      input.type,
    );
    const outbound = ["WITHDRAWAL", "ADJUSTMENT_OUT", "INVENTORY_LOSS"].includes(
      input.type,
    );

    if (inbound && !input.toLocationId) {
      ctx.addIssue({
        code: "custom",
        path: ["toLocationId"],
        message: "Localização de destino é obrigatória",
      });
    }

    if (outbound && !input.fromLocationId) {
      ctx.addIssue({
        code: "custom",
        path: ["fromLocationId"],
        message: "Localização de origem é obrigatória",
      });
    }

    if (input.type === "TRANSFER") {
      if (!input.fromLocationId) {
        ctx.addIssue({
          code: "custom",
          path: ["fromLocationId"],
          message: "Localização de origem é obrigatória",
        });
      }
      if (!input.toLocationId) {
        ctx.addIssue({
          code: "custom",
          path: ["toLocationId"],
          message: "Localização de destino é obrigatória",
        });
      }
      if (
        input.fromLocationId &&
        input.toLocationId &&
        input.fromLocationId === input.toLocationId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["toLocationId"],
          message: "Origem e destino devem ser diferentes",
        });
      }
    }

    if (
      ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "INVENTORY_GAIN", "INVENTORY_LOSS"].includes(
        input.type,
      ) &&
      !input.reason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Justificativa é obrigatória",
      });
    }
  });

export const inventoryBalancesQuerySchema = z.object({
  productId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  lotCode: z.string().trim().min(1).max(120).transform((value) => value.toUpperCase()).optional(),
  serialNumber: z.string().trim().min(1).max(200).optional(),
});

export const inventoryMovementsQuerySchema = z.object({
  productId: z.string().min(1).optional(),
  type: stockMovementTypeSchema.optional(),
  lotCode: z.string().trim().min(1).max(120).transform((value) => value.toUpperCase()).optional(),
  serialNumber: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PostInventoryMovementInput = z.input<typeof postInventoryMovementSchema>;
export type ParsedInventoryMovementInput = z.output<typeof postInventoryMovementSchema>;
export type InventoryBalancesQuery = z.output<typeof inventoryBalancesQuerySchema>;
export type InventoryMovementsQuery = z.output<typeof inventoryMovementsQuerySchema>;
