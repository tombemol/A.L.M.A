import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";
import { resetAuthTables } from "./helpers/database.js";

describe("HTTP session lifecycle", () => {
  beforeEach(resetAuthTables);

  it("returns 401 from /me without a session", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("supports login -> me -> logout and revokes the session", async () => {
    await prisma.user.create({
      data: {
        employeeCode: "2002",
        displayName: "Operador HTTP",
        pinHash: await hashSecret("7788"),
      },
    });

    const agent = request.agent(app);

    await agent
      .post("/api/auth/operator/login")
      .send({ employeeCode: "2002", pin: "7788" })
      .expect(200);

    await agent
      .get("/api/auth/me")
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.employeeCode).toBe("2002");
      });

    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });
});
