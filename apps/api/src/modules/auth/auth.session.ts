import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@alma/database";
import { env } from "../../config/env.js";
import type { SessionUser } from "./auth.types.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  );

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function resolveSession(
  token: string,
): Promise<SessionUser | null> {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.active
  ) {
    return null;
  }

  const permissions = [
    ...new Set(
      session.user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.code),
      ),
    ),
  ];

  return {
    id: session.user.id,
    employeeCode: session.user.employeeCode,
    username: session.user.username,
    displayName: session.user.displayName,
    permissions,
  };
}

export async function revokeSession(token: string) {
  await prisma.authSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
