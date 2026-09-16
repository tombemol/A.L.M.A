import { z } from "zod";

export function normalizeLocationCode(value: string) {
  return value.trim().toUpperCase();
}

const codeSchema = z
  .string()
  .trim()
  .min(1, "Código é obrigatório")
  .max(80, "Código deve ter no máximo 80 caracteres")
  .transform(normalizeLocationCode);

export const storageLocationKindSchema = z.enum([
  "AISLE",
  "RACK",
  "SHELF",
  "POSITION",
]);

export const occupancyModeSchema = z.enum(["DEDICATED", "SHARED"]);

export const createWarehouseSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(160),
  description: z.string().trim().max(1000).optional(),
});

export const updateWarehouseSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export const createStorageLocationSchema = z.object({
  kind: storageLocationKindSchema,
  code: codeSchema,
  name: z.string().trim().min(1).max(160).optional(),
  parentId: z.string().min(1).optional(),
  occupancyMode: occupancyModeSchema.optional(),
});

export const updateStorageLocationSchema = z.object({
  kind: storageLocationKindSchema.optional(),
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(160).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  occupancyMode: occupancyModeSchema.nullable().optional(),
  active: z.boolean().optional(),
});

export const associateProductLocationSchema = z.object({
  locationId: z.string().min(1, "Posição é obrigatória"),
  isPrimary: z.boolean().default(false),
});

export const warehouseIdParamSchema = z.object({
  warehouseId: z.string().min(1, "Almoxarifado é obrigatório"),
});

export const locationIdParamSchema = z.object({
  id: z.string().min(1, "Localização é obrigatória"),
});

export const productLocationProductParamSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
});

export const productLocationAssociationParamSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  associationId: z.string().min(1, "Associação é obrigatória"),
});

export type CreateWarehouseInput = z.input<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.input<typeof updateWarehouseSchema>;
export type CreateStorageLocationInput = z.input<
  typeof createStorageLocationSchema
>;
export type UpdateStorageLocationInput = z.input<
  typeof updateStorageLocationSchema
>;
export type AssociateProductLocationInput = z.input<
  typeof associateProductLocationSchema
>;
