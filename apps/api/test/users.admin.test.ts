import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";
import { resetAuthTables } from "./helpers/database.js";

async function createAdminAgent() {
  const usersRead = await prisma.permission.create({
    data: { code: PERMISSIONS.USERS_READ, name: "Read users" },
  });
  const usersManage = await prisma.permission.create({
    data: { code: PERMISSIONS.USERS_MANAGE, name: "Manage users" },
  });
  const role = await prisma.role.create({
    data: {
      code: "ADMIN",
      name: "Administrador",
      permissions: {
        create: [
          { permissionId: usersRead.id },
          { permissionId: usersManage.id },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      username: "admin",
      displayName: "Admin",
      passwordHash: await hashSecret("super-secret-password"),
      roles: { create: { roleId: role.id } },
    },
  });

  const agent = request.agent(app);
  await agent
    .post("/api/auth/admin/login")
    .send({
      username: "admin",
      password: "super-secret-password",
    })
    .expect(200);

  return { agent, role };
}

describe("user administration", () => {
  beforeEach(resetAuthTables);

  it("rejects anonymous user creation", async () => {
    await request(app)
      .post("/api/users")
      .send({
        displayName: "Operator",
        employeeCode: "3001",
        pin: "4829",
        roleCodes: ["SOLICITANTE"],
      })
      .expect(401);
  });

  it("creates an operator without exposing hashes", async () => {
    const { agent } = await createAdminAgent();
    await prisma.role.create({
      data: { code: "SOLICITANTE", name: "Solicitante" },
    });

    const response = await agent
      .post("/api/users")
      .send({
        displayName: "Operator",
        employeeCode: "3001",
        pin: "4829",
        roleCodes: ["SOLICITANTE"],
      })
      .expect(201);

    expect(response.body.user.employeeCode).toBe("3001");
    expect(response.body.user.pinHash).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();

    const stored = await prisma.user.findUniqueOrThrow({
      where: { employeeCode: "3001" },
    });

    expect(stored.pinHash).not.toBe("4829");
  });

  it("returns 409 for duplicate employeeCode", async () => {
    const { agent } = await createAdminAgent();
    await prisma.role.create({
      data: { code: "SOLICITANTE", name: "Solicitante" },
    });

    const payload = {
      displayName: "Operator",
      employeeCode: "3001",
      pin: "4829",
      roleCodes: ["SOLICITANTE"],
    };

    await agent.post("/api/users").send(payload).expect(201);

    await agent
      .post("/api/users")
      .send({ ...payload, displayName: "Duplicate" })
      .expect(409)
      .expect(({ body }) => {
        expect(body.error.code).toBe("DUPLICATE_IDENTIFIER");
      });
  });

  it("revokes live sessions when user is disabled", async () => {
    const { agent: admin } = await createAdminAgent();
    const role = await prisma.role.create({
      data: { code: "SOLICITANTE", name: "Solicitante" },
    });

    const operator = await prisma.user.create({
      data: {
        employeeCode: "4001",
        displayName: "Operator",
        pinHash: await hashSecret("4829"),
        roles: { create: { roleId: role.id } },
      },
    });

    const operatorAgent = request.agent(app);

    await operatorAgent
      .post("/api/auth/operator/login")
      .send({ employeeCode: "4001", pin: "4829" })
      .expect(200);

    await operatorAgent.get("/api/auth/me").expect(200);

    await admin
      .patch(`/api/users/${operator.id}/status`)
      .send({ active: false })
      .expect(200);

    await operatorAgent.get("/api/auth/me").expect(401);
  });
});
