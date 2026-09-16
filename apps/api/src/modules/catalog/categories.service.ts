import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  normalizeCode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./catalog.schemas.js";

function notFound(message: string) {
  return new DomainError("NOT_FOUND", 404, message);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DomainError(
      "DUPLICATE_CODE",
      409,
      "Já existe uma categoria com este código",
    );
  }
  throw error;
}

async function assertParentAllowed(
  parentId: string | null | undefined,
  categoryId?: string,
) {
  if (!parentId) return;

  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (categoryId && currentId === categoryId) {
      throw new DomainError(
        "CATEGORY_CYCLE",
        409,
        "A hierarquia de categorias não pode formar um ciclo",
      );
    }

    if (visited.has(currentId)) {
      throw new DomainError(
        "CATEGORY_CYCLE",
        409,
        "A hierarquia de categorias existente contém um ciclo",
      );
    }
    visited.add(currentId);

    const current: { id: string; parentId: string | null } | null =
      await prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true },
      });

    if (!current) {
      throw notFound("Categoria pai não encontrada");
    }

    currentId = current.parentId;
  }
}

export async function listCategories() {
  return prisma.category.findMany({
    include: {
      parent: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}

export async function createCategory(input: CreateCategoryInput) {
  await assertParentAllowed(input.parentId);

  try {
    return await prisma.category.create({
      data: {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      },
    });
  } catch (error) {
    return mapWriteError(error);
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound("Categoria não encontrada");

  if (input.parentId !== undefined) {
    await assertParentAllowed(input.parentId, id);
  }

  const data: Prisma.CategoryUpdateInput = {
    ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.parentId !== undefined
      ? input.parentId === null
        ? { parent: { disconnect: true } }
        : { parent: { connect: { id: input.parentId } } }
      : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  };

  try {
    return await prisma.category.update({ where: { id }, data });
  } catch (error) {
    return mapWriteError(error);
  }
}
