import { describe, expect, it } from "vitest";
import { alertListQuerySchema } from "../src/modules/alerts/alerts.schemas.js";

describe("schema de consulta de alertas", () => {
  it("interpreta active=false como falso e active=true como verdadeiro", () => {
    expect(alertListQuerySchema.parse({ active: "false" }).active).toBe(false);
    expect(alertListQuerySchema.parse({ active: "true" }).active).toBe(true);
  });
});
