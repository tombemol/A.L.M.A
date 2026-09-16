import argon2 from "argon2";
import { PERMISSIONS } from "@alma/shared";
import { prisma } from "../src/client.js";

const permissionEntries = [
  [PERMISSIONS.USERS_READ, "Consultar usuários"],
  [PERMISSIONS.USERS_MANAGE, "Gerenciar usuários"],
  [PERMISSIONS.ROLES_READ, "Consultar papéis"],
  [PERMISSIONS.ROLES_MANAGE, "Gerenciar papéis"],
  [PERMISSIONS.ADMIN_ACCESS, "Acesso administrativo"],
  [PERMISSIONS.CATALOG_READ, "Consultar catálogo"],
  [PERMISSIONS.CATALOG_MANAGE, "Gerenciar catálogo"],
  [PERMISSIONS.LOCATIONS_READ, "Consultar localizações"],
  [PERMISSIONS.LOCATIONS_MANAGE, "Gerenciar localizações"],
] as const;

const roleNames = {
  ADMIN: "Administrador",
  ALMOXARIFE: "Almoxarife",
  SOLICITANTE: "Solicitante",
  APROVADOR: "Aprovador",
} as const;

const rolePermissionCodes = {
  ADMIN: Object.values(PERMISSIONS),
  ALMOXARIFE: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.LOCATIONS_READ,
    PERMISSIONS.LOCATIONS_MANAGE,
  ],
  SOLICITANTE: [PERMISSIONS.CATALOG_READ, PERMISSIONS.LOCATIONS_READ],
  APROVADOR: [PERMISSIONS.CATALOG_READ, PERMISSIONS.LOCATIONS_READ],
} as const;

async function main() {
  const permissionRows = new Map<string, string>();

  for (const [code, name] of permissionEntries) {
    const row = await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    permissionRows.set(code, row.id);
  }

  const roleRows = new Map<string, string>();

  for (const [code, name] of Object.entries(roleNames)) {
    const row = await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    roleRows.set(code, row.id);
  }

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissionCodes)) {
    const roleId = roleRows.get(roleCode);
    if (!roleId) throw new Error(`Papel não criado: ${roleCode}`);

    for (const code of permissionCodes) {
      const permissionId = permissionRows.get(code);
      if (!permissionId) throw new Error(`Permissão não criada: ${code}`);

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  const adminRoleId = roleRows.get("ADMIN");
  if (!adminRoleId) throw new Error("Papel ADMIN não criado");

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (username && password) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const admin = await prisma.user.upsert({
      where: { username },
      update: { active: true, passwordHash },
      create: {
        username,
        displayName: "Administrador",
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: admin.id, roleId: adminRoleId },
      },
      update: {},
      create: { userId: admin.id, roleId: adminRoleId },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
