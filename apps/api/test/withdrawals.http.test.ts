import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";

async function resetAuthAndWithdrawals() {
  await prisma.approval.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
}

async function createLoggedAgent(permissionCodes: string[]) {
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.create({ data: { code, name: code } }),
    ),
  );
  const role = await prisma.role.create({
    data: {
      code: `ROLE-${Math.random().toString(36).slice(2, 8)}`,
      name: "Teste",
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
  });
  await prisma.user.create({
    data: {
      username: `user-${Math.random().toString(36).slice(2, 8)}`,
      displayName: "Usuário teste",
      passwordHash: await hashSecret("super-secret-password"),
      roles: { create: { roleId: role.id } },
    },
  });

  const agent = request.agent(app);
  const username = (await prisma.user.findFirstOrThrow({ where: { roles: { some: { roleId: role.id } } } })).username!;
  await agent
    .post("/api/auth/admin/login")
    .send({ username, password: "super-secret-password" })
    .expect(200);
  return agent;
}

describe("HTTP da Fase 1D", () => {
  beforeEach(resetAuthAndWithdrawals);

  it("protege leitura de retiradas por autenticação e permissão", async () => {
    await request(app).get("/api/withdrawal-requests").expect(401);

    const noPermission = await createLoggedAgent([]);
    await noPermission.get("/api/withdrawal-requests").expect(403);
  });

  it("permite leitura com withdrawals.read", async () => {
    const agent = await createLoggedAgent([PERMISSIONS.WITHDRAWALS_READ]);
    const response = await agent.get("/api/withdrawal-requests").expect(200);
    expect(response.body).toEqual(
      expect.objectContaining({ requests: expect.any(Array), total: 0 }),
    );
  });

  it("bloqueia WITHDRAWAL no endpoint genérico de inventário", async () => {
    const agent = await createLoggedAgent([PERMISSIONS.INVENTORY_MOVE]);
    const response = await agent
      .post("/api/inventory/movements")
      .send({ type: "WITHDRAWAL" })
      .expect(409);

    expect(response.body.error?.code).toBe("WITHDRAWAL_REQUEST_REQUIRED");
  });
});
