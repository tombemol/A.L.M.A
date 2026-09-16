import { z } from "zod";

export const operatorLoginSchema = z.object({
  employeeCode: z.string().trim().min(1).max(64),
  pin: z.string().min(4).max(32),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(8).max(256),
});

export type OperatorLoginInput = z.infer<typeof operatorLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
