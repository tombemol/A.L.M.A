import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { resetAuthTables } from "./helpers/database.js";
import { hashSecret } from "../src/modules/auth/password.js";
import {
  loginAdmin,
  loginOperator,
} from "../src/modules/auth/auth.service.js";

describe("auth login service", () => {
  beforeEach(resetAuthTables);

  it("logs an operator in using employee code + PIN", async () => {
    await prisma.user.create({
      data: {
        employeeCode: "1234",
        displayName: "Operador",
        pinHash: await hashSecret("4829"),
      },
    });

    const result = await loginOperator({
      employeeCode: "1234",
      pin: "4829",
    });

    expect(result.user.employeeCode).toBe("1234");
    expect(result.token.length).toBeGreaterThan(20);
  });

  it("logs an administrator in using username + password", async () => {
    await prisma.user.create({
      data: {
        username: "admin",
        displayName: "Administrador",
        passwordHash: await hashSecret("correct-horse-battery-staple"),
      },
    });

    const result = await loginAdmin({
      username: "admin",
      password: "correct-horse-battery-staple",
    });

    expect(result.user.username).toBe("admin");
  });

  it("uses the same generic error for an unknown user", async () => {
    await expect(
      loginOperator({ employeeCode: "missing", pin: "4829" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
  });

  it("uses the same generic error for a wrong secret", async () => {
    await prisma.user.create({
      data: {
        employeeCode: "1234",
        displayName: "Operador",
        pinHash: await hashSecret("4829"),
      },
    });

    await expect(
      loginOperator({ employeeCode: "1234", pin: "0000" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
  });
});
