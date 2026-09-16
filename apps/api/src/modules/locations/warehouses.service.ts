import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  createWarehouseSchema,
  normalizeLocationCode,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "./locations.schemas.js";

function mapWarehouseWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DomainError(
      "DUPLICATE_CODE",
      409,
      "Já existe um almoxarifado com este código",
    );
  }
  throw error;
}

export async function listWarehouses() {
  return prisma.warehouse.findMany({
    orderBy: [{ active: "desc" }, { code: "asc" }],
  });
}

export async function createWarehouse(input: CreateWarehouseInput) {
  const parsed = createWarehouseSchema.parse(input);

  try {
    return await prisma.warehouse.create({
      data: {
        code: normalizeLocationCode(parsed.code),
        name: parsed.name,
        ...(parsed.description !== undefined
          ? { description: parsed.description }
          : {}),
      },
    });
  } catch (error) {
    return mapWarehouseWriteError(error);
  }
}

export async function updateWarehouse(
  id: string,
  input: UpdateWarehouseInput,
) {
  const parsed = updateWarehouseSchema.parse(input);
  const existing = await prisma.warehouse.findUnique({ where: { id } });

  if (!existing) {
    throw new DomainError("NOT_FOUND", 404, "Almoxarifado não encontrado");
  }

  try {
    return await prisma.warehouse.update({
      where: { id },
      data: {
        ...(parsed.code !== undefined
          ? { code: normalizeLocationCode(parsed.code) }
          : {}),
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.description !== undefined
          ? { description: parsed.description }
          : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      },
    });
  } catch (error) {
    return mapWarehouseWriteError(error);
  }
}
