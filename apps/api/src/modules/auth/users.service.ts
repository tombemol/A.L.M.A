import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import type { CreateUserInput } from "./users.schemas.js";
import { hashSecret } from "./password.js";

const publicUserSelect = {
  id: true,
  employeeCode: true,
  username: true,
  displayName: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

async function resolveRoles(roleCodes: string[]) {
  const uniqueCodes = [...new Set(roleCodes)];

  const roles = await prisma.role.findMany({
    where: { code: { in: uniqueCodes } },
  });

  if (roles.length !== uniqueCodes.length) {
    const found = new Set(roles.map((role) => role.code));
    const missing = uniqueCodes.filter((code) => !found.has(code));

    throw new DomainError(
      "INVALID_ROLE",
      400,
      "Um ou mais papéis são inválidos",
      { missing },
    );
  }

  return roles;
}

export async function createUser(input: CreateUserInput) {
  const roles = await resolveRoles(input.roleCodes);

  try {
    return await prisma.user.create({
      data: {
        displayName: input.displayName,
        ...(input.employeeCode
          ? { employeeCode: input.employeeCode }
          : {}),
        ...(input.username ? { username: input.username } : {}),
        pinHash: input.pin ? await hashSecret(input.pin) : null,
        passwordHash: input.password
          ? await hashSecret(input.password)
          : null,
        roles: {
          create: roles.map((role) => ({ roleId: role.id })),
        },
      },
      select: publicUserSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DomainError(
        "DUPLICATE_IDENTIFIER",
        409,
        "Matrícula ou usuário já cadastrado",
      );
    }

    throw error;
  }
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      ...publicUserSelect,
      roles: {
        select: {
          role: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });
}

export async function setUserActive(
  userId: string,
  active: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      throw new DomainError(
        "USER_NOT_FOUND",
        404,
        "Usuário não encontrado",
      );
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { active },
      select: publicUserSelect,
    });

    if (!active) {
      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return user;
  });
}

export async function replaceUserRoles(
  userId: string,
  roleCodes: string[],
) {
  const roles = await resolveRoles(roleCodes);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      throw new DomainError(
        "USER_NOT_FOUND",
        404,
        "Usuário não encontrado",
      );
    }

    await tx.userRole.deleteMany({ where: { userId } });

    await tx.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.id,
      })),
    });

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...publicUserSelect,
        roles: {
          select: {
            role: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  });
}
