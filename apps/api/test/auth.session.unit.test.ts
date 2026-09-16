import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { resetAuthTables } from "./helpers/database.js";
import {
  createSession,
  resolveSession,
  revokeSession,
} from "../src/modules/auth/auth.session.js";

describe("auth sessions", () => {
  beforeEach(resetAuthTables);

  it("resolves an active session and stops resolving after revoke", async () => {
    const user = await prisma.user.create({
      data: { displayName: "Teste", employeeCode: "2001" },
    });

    const session = await createSession(user.id);

    expect(await resolveSession(session.token)).toMatchObject({
      id: user.id,
      employeeCode: "2001",
    });

    await revokeSession(session.token);
    expect(await resolveSession(session.token)).toBeNull();
  });
});
