import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "./password.js";

describe("secret hashing", () => {
  it("verifies the original secret and rejects a different one", async () => {
    const hash = await hashSecret("4829");

    expect(hash).not.toContain("4829");
    await expect(verifySecret(hash, "4829")).resolves.toBe(true);
    await expect(verifySecret(hash, "0000")).resolves.toBe(false);
  });
});
