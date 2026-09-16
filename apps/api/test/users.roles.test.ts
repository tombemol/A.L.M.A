import request from "supertest";
import { beforeEach, describe, it } from "vitest";
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
  const adminRole = await prisma.role.create({
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
      roles: { create: { roleId: adminRole.id } },
    },
  });

  const agent = request.agent(app);
  await agent
    .post("/api/auth/admin/login")
    .send({ username: "admin", password: "super-secret-password" })
    .expect(200);

  return agent;
}

describe("user role replacement", () => {
  beforeEach(resetAuthTables);

  it("applies new permissions to an existing session on its next request", async () => {
    const admin = await createAdminAgent();
    const usersRead = await prisma.permission.findUniqueOrThrow({
      where: { code: PERMISSIONS.USERS_READ },
    });
    const requesterRole = await prisma.role.create({
      data: { code: "SOLICITANTE", name: "Solicitante" },
    });
    await prisma.role.create({
      data: {
        code: "USER_READER",
        name: "Leitor de usuários",
        permissions: {
          create: { permissionId: usersRead.id },
        },
      },
    });

    const operator = await prisma.user.create({
      data: {
        employeeCode: "5001",
        displayName: "Operator",
        pinHash: await hashSecret("4829"),
        roles: { create: { roleId: requesterRole.id } },
      },
    });

    const operatorAgent = request.agent(app);
    await operatorAgent
      .post("/api/auth/operator/login")
      .send({ employeeCode: "5001", pin: "4829" })
      .expect(200);

    await operatorAgent.get("/api/users").expect(403);

    await admin
      .put(`/api/users/${operator.id}/roles`)
      .send({ roleCodes: ["USER_READER"] })
      .expect(200);

    await operatorAgent.get("/api/users").expect(200);
  });
});
