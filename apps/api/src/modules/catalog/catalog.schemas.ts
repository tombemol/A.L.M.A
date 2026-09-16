import { z } from "zod";

export function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeIdentifier(value: string) {
  return value.trim().toUpperCase();
}

const codeSchema = z
  .string()
  .trim()
  .min(1, "Código é obrigatório")
  .max(64, "Código deve ter no máximo 64 caracteres")
  .transform(normalizeCode);

export const entityIdParamSchema = z.object({
  id: z.string().min(1, "Identificador é obrigatório"),
});

export const createCategorySchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(120),
  parentId: z.string().min(1).nullable().optional(),
  requiresWithdrawalApproval: z.boolean().default(false),
});

export const updateCategorySchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().min(1).nullable().optional(),
  requiresWithdrawalApproval: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const createUnitSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(120),
  symbol: z.string().trim().min(1, "Símbolo é obrigatório").max(24),
  allowsDecimal: z.boolean().default(false),
});

export const updateUnitSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  symbol: z.string().trim().min(1).max(24).optional(),
  allowsDecimal: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const productIdentifierTypeSchema = z.enum([
  "EAN",
  "UPC",
  "MANUFACTURER",
  "INTERNAL_BARCODE",
  "QR",
  "OTHER",
]);

export const inventoryTrackingModeSchema = z.enum([
  "NONE",
  "LOT",
  "LOT_EXPIRY",
  "SERIAL",
  "SERIAL_EXPIRY",
]);

export const productIdentifierInputSchema = z.object({
  type: productIdentifierTypeSchema,
  value: z.string().trim().min(1, "Identificador é obrigatório").max(200),
  label: z.string().trim().min(1).max(120).optional(),
});

export const productConversionInputSchema = z.object({
  unitId: z.string().min(1, "Unidade é obrigatória"),
  factorToBase: z.coerce
    .number()
    .positive("Fator de conversão deve ser maior que zero"),
});

export const createProductSchema = z.object({
  sku: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(160),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  baseUnitId: z.string().min(1, "Unidade base é obrigatória"),
  manufacturer: z.string().trim().max(160).optional(),
  trackingMode: inventoryTrackingModeSchema.default("NONE"),
  requiresWithdrawalApproval: z.boolean().default(false),
  identifiers: z.array(productIdentifierInputSchema).default([]),
  conversions: z.array(productConversionInputSchema).default([]),
});

export const updateProductSchema = z.object({
  sku: codeSchema.optional(),
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  baseUnitId: z.string().min(1).optional(),
  manufacturer: z.string().trim().max(160).nullable().optional(),
  trackingMode: inventoryTrackingModeSchema.optional(),
  requiresWithdrawalApproval: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const replaceProductConversionsSchema = z.object({
  conversions: z.array(productConversionInputSchema),
});

export const resolveIdentifierParamSchema = z.object({
  identifier: z.string().trim().min(1, "Identificador é obrigatório"),
});

export const productIdentifierParamSchema = z.object({
  id: z.string().min(1),
  identifierId: z.string().min(1),
});

export const productListQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().min(1).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;
export type CreateUnitInput = z.input<typeof createUnitSchema>;
export type UpdateUnitInput = z.input<typeof updateUnitSchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type ProductIdentifierInput = z.input<typeof productIdentifierInputSchema>;
export type ReplaceProductConversionsInput = z.input<
  typeof replaceProductConversionsSchema
>;
export type ProductListQuery = z.output<typeof productListQuerySchema>;
