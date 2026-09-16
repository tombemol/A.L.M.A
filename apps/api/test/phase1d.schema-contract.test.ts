import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function text(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("contrato de persistência da Fase 1D", () => {
  it("modela destinos, solicitações, decisões e política de aprovação", async () => {
    const schema = await text("../../../packages/database/prisma/schema.prisma");

    expect(schema).toMatch(/enum WithdrawalRequestStatus/);
    expect(schema).toMatch(/PENDING_APPROVAL/);
    expect(schema).toMatch(/FULFILLING/);
    expect(schema).toMatch(/FULFILLED/);
    expect(schema).toMatch(/enum ApprovalDecision/);

    expect(schema).toMatch(/model Department/);
    expect(schema).toMatch(/model Equipment/);
    expect(schema).toMatch(/model WorkOrder/);
    expect(schema).toMatch(/model WithdrawalRequest/);
    expect(schema).toMatch(/model Approval/);

    expect(schema).toMatch(/requiresWithdrawalApproval\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/stockMovementId\s+String\?\s+@unique/);
    expect(schema).toMatch(/quantity\s+Decimal\s+@db\.Decimal\(18, 6\)/);
  });

  it("cria permissões e papéis operacionais da retirada", async () => {
    const permissions = await text("../../../packages/shared/src/permissions.ts");
    const seed = await text("../../../packages/database/prisma/seed.ts");

    for (const code of [
      "withdrawals.read",
      "withdrawals.request",
      "withdrawals.approve",
      "withdrawals.fulfill",
      "destinations.read",
      "destinations.manage",
    ]) {
      expect(permissions).toContain(code);
      expect(seed).toContain(code.toUpperCase().replace(/\./g, "_"));
    }

    expect(seed).toContain("WITHDRAWALS_REQUEST");
    expect(seed).toContain("WITHDRAWALS_APPROVE");
    expect(seed).toContain("WITHDRAWALS_FULFILL");
    expect(seed).toContain("DESTINATIONS_MANAGE");
  });

  it("mantém constraints de quantidade e histórico na migration", async () => {
    const migration = await text(
      "../../../packages/database/prisma/migrations/20260916180000_withdrawals_approvals/migration.sql",
    );

    expect(migration).toMatch(/WithdrawalRequest_quantity_positive/);
    expect(migration).toMatch(/CHECK \(\"quantity\" > 0\)/);
    expect(migration).toMatch(/ON DELETE RESTRICT/);
    expect(migration).toMatch(/WithdrawalRequest_stockMovementId_key/);
  });
});
