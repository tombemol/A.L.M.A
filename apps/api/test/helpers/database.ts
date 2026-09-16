import { prisma } from "@alma/database";

export async function resetAuthTables() {
  await prisma.authSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}
