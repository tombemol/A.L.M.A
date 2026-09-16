import argon2 from "argon2";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashSecret(secret: string) {
  return argon2.hash(secret, ARGON2_OPTIONS);
}

export function verifySecret(hash: string, secret: string) {
  return argon2.verify(hash, secret);
}
