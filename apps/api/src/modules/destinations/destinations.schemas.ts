import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(1, "Código é obrigatório")
  .max(64, "Código deve ter no máximo 64 caracteres")
  .transform((value) => value.toUpperCase());

export const createDepartmentSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(160),
});

export const updateDepartmentSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(1).max(160).optional(),
  active: z.boolean().optional(),
});

export const createEquipmentSchema = z.object({
  departmentId: z.string().min(1, "Setor é obrigatório"),
  code: codeSchema,
  name: z.string().trim().min(1, "Nome é obrigatório").max(160),
  description: z.string().trim().max(1000).optional(),
});

export const createWorkOrderSchema = z.object({
  code: codeSchema,
  departmentId: z.string().min(1, "Setor é obrigatório"),
  equipmentId: z.string().min(1).optional(),
  description: z.string().trim().max(1000).optional(),
});

export type CreateDepartmentInput = z.input<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.input<typeof updateDepartmentSchema>;
export type CreateEquipmentInput = z.input<typeof createEquipmentSchema>;
export type CreateWorkOrderInput = z.input<typeof createWorkOrderSchema>;
