import { beforeEach, expect, test } from "vitest";
import { prisma } from "@alma/database";
import { resetAuthTables } from "./helpers/database.js";

beforeEach(resetAuthTables);

test("persists a user", async () => {
  const user = await prisma.user.create({
    data: {
      employeeCode: "1001",
      displayName: "Operador Teste",
    },
  });

  expect(user.employeeCode).toBe("1001");
});
