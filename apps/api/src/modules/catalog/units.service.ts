import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  normalizeCode,
  type CreateUnitInput,
  type UpdateUnitInput,
} from "./catalog.schemas.js";

function mapWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DomainError(
      "DUPLICATE_CODE",
      409,
      "Já existe uma unidade com este código",
    );
  }
  throw error;
}

export async function listUnits() {
  return prisma.unitOfMeasure.findMany({
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}

export async function createUnit(input: CreateUnitInput) {
  try {
    return await prisma.unitOfMeasure.create({
      data: {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        symbol: input.symbol.trim(),
        allowsDecimal: input.allowsDecimal ?? false,
      },
    });
  } catch (error) {
    return mapWriteError(error);
  }
}

export async function updateUnit(id: string, input: UpdateUnitInput) {
  const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
  if (!existing) {
    throw new DomainError("NOT_FOUND", 404, "Unidade não encontrada");
  }

  const data: Prisma.UnitOfMeasureUpdateInput = {
    ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.symbol !== undefined ? { symbol: input.symbol.trim() } : {}),
    ...(input.allowsDecimal !== undefined
      ? { allowsDecimal: input.allowsDecimal }
      : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  };

  try {
    return await prisma.unitOfMeasure.update({ where: { id }, data });
  } catch (error) {
    return mapWriteError(error);
  }
}
