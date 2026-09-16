import { describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { PERMISSIONS } from "@alma/shared";

describe("contrato persistente da Fase 1E", () => {
  it("expõe políticas de reposição, alertas e auditoria no Prisma", () => {
    const client = prisma as unknown as Record<string, unknown>;

    expect(client.reorderPolicy).toBeDefined();
    expect(client.alert).toBeDefined();
    expect(client.auditLog).toBeDefined();
  });

  it("expõe permissões próprias para alertas e auditoria", () => {
    const permissions = PERMISSIONS as unknown as Record<string, string>;

    expect(permissions.ALERTS_READ).toBe("alerts.read");
    expect(permissions.ALERTS_MANAGE).toBe("alerts.manage");
    expect(permissions.AUDIT_READ).toBe("audit.read");
  });
});
