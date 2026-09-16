import request from "supertest";
import { beforeEach, describe, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";
import { resetAuthTables } from "./helpers/database.js";

describe("RBAC", () => {
  beforeEach(resetAuthTables);

  it("rejects anonymous requests", async () => {
    await request(app).get("/api/internal/admin-check").expect(401);
  });

  it("rejects authenticated user without permission", async () => {
    await prisma.user.create({
      data: {
        username: "limited",
        displayName: "Limited",
        passwordHash: await hashSecret("super-secret-password"),
      },
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/admin/login")
      .send({
        username: "limited",
        password: "super-secret-password",
      })
      .expect(200);

    await agent.get("/api/internal/admin-check").expect(403);
  });

  it("allows a user with admin.access", async () => {
    const permission = await prisma.permission.create({
      data: {
        code: PERMISSIONS.ADMIN_ACCESS,
        name: "Admin access",
      },
    });

    const role = await prisma.role.create({
      data: {
        code: "ADMIN",
        name: "Administrador",
        permissions: {
          create: { permissionId: permission.id },
        },
      },
    });

    await prisma.user.create({
      data: {
        username: "admin",
        displayName: "Admin",
        passwordHash: await hashSecret("super-secret-password"),
        roles: {
          create: { roleId: role.id },
        },
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

    await agent.get("/api/internal/admin-check").expect(204);
  });
});
