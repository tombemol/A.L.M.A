import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import { createSession } from "./auth.session.js";
import type {
  AdminLoginInput,
  OperatorLoginInput,
} from "./auth.schemas.js";
import { verifySecret } from "./password.js";

function invalidCredentials() {
  return new DomainError(
    "INVALID_CREDENTIALS",
    401,
    "Credenciais inválidas",
  );
}

function publicUser(user: {
  id: string;
  employeeCode: string | null;
  username: string | null;
  displayName: string;
}) {
  return {
    id: user.id,
    employeeCode: user.employeeCode,
    username: user.username,
    displayName: user.displayName,
  };
}

export async function loginOperator(input: OperatorLoginInput) {
  const user = await prisma.user.findUnique({
    where: { employeeCode: input.employeeCode },
  });

  if (!user?.active || !user.pinHash) throw invalidCredentials();
  if (!(await verifySecret(user.pinHash, input.pin))) {
    throw invalidCredentials();
  }

  const session = await createSession(user.id);
  return { user: publicUser(user), ...session };
}

export async function loginAdmin(input: AdminLoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (!user?.active || !user.passwordHash) throw invalidCredentials();
  if (!(await verifySecret(user.passwordHash, input.password))) {
    throw invalidCredentials();
  }

  const session = await createSession(user.id);
  return { user: publicUser(user), ...session };
}
