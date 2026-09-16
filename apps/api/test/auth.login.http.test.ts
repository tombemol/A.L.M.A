import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { app } from "../src/app.js";
import { hashSecret } from "../src/modules/auth/password.js";
import { resetAuthTables } from "./helpers/database.js";

describe("POST /api/auth/operator/login", () => {
  beforeEach(resetAuthTables);

  it("sets an HttpOnly session cookie", async () => {
    await prisma.user.create({
      data: {
        employeeCode: "1001",
        displayName: "Operador",
        pinHash: await hashSecret("4829"),
      },
    });

    const response = await request(app)
      .post("/api/auth/operator/login")
      .send({ employeeCode: "1001", pin: "4829" })
      .expect(200);

    const setCookie = response.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(response.body.user.employeeCode).toBe("1001");
    expect(response.body.token).toBeUndefined();
  });

  it("returns 400 for malformed body", async () => {
    await request(app)
      .post("/api/auth/operator/login")
      .send({ employeeCode: "", pin: "1" })
      .expect(400);
  });
});
