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
});

export const updateCategorySchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().min(1).nullable().optional(),
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

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;
export type CreateUnitInput = z.input<typeof createUnitSchema>;
export type UpdateUnitInput = z.input<typeof updateUnitSchema>;
