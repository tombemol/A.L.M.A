import { describe, expect, it } from "vitest";
import { DomainError } from "./errors.js";

describe("DomainError", () => {
  it("preserves code, status and details", () => {
    const error = new DomainError("PERMISSION_DENIED", 403, "Forbidden", {
      permission: "users.manage",
    });

    expect(error.code).toBe("PERMISSION_DENIED");
    expect(error.status).toBe(403);
    expect(error.details).toEqual({ permission: "users.manage" });
  });
});
