import { z } from "zod";

export const createUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    employeeCode: z.string().trim().min(1).max(64).optional(),
    username: z.string().trim().min(1).max(64).optional(),
    pin: z.string().min(4).max(32).optional(),
    password: z.string().min(8).max(256).optional(),
    roleCodes: z.array(z.string().trim().min(1)).min(1),
  })
  .superRefine((value, ctx) => {
    if (!value.employeeCode && !value.username) {
      ctx.addIssue({
        code: "custom",
        message: "employeeCode ou username é obrigatório",
      });
    }

    if (value.employeeCode && !value.pin) {
      ctx.addIssue({
        code: "custom",
        path: ["pin"],
        message: "PIN é obrigatório quando employeeCode é informado",
      });
    }

    if (value.username && !value.password) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Senha é obrigatória quando username é informado",
      });
    }
  });

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const setUserStatusSchema = z.object({
  active: z.boolean(),
});

export const replaceUserRolesSchema = z.object({
  roleCodes: z.array(z.string().trim().min(1)).min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
