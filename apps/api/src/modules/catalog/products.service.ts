import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  createProductSchema,
  normalizeCode,
  normalizeIdentifier,
  productIdentifierInputSchema,
  replaceProductConversionsSchema,
  updateProductSchema,
  type CreateProductInput,
  type ProductIdentifierInput,
  type ProductListQuery,
  type ReplaceProductConversionsInput,
  type UpdateProductInput,
} from "./catalog.schemas.js";

const productInclude = {
  category: true,
  baseUnit: true,
  identifiers: { orderBy: { createdAt: "asc" } },
  conversions: {
    include: { unit: true },
    orderBy: { unitId: "asc" },
  },
  locations: {
    include: {
      warehouse: true,
      location: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ProductInclude;

function notFound(message = "Produto não encontrado") {
  return new DomainError("NOT_FOUND", 404, message);
}

function mapProductWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = JSON.stringify(error.meta?.target ?? "");
    if (target.includes("sku")) {
      throw new DomainError("DUPLICATE_SKU", 409, "SKU já cadastrado");
    }
    if (target.includes("normalizedValue")) {
      throw new DomainError(
        "DUPLICATE_IDENTIFIER",
        409,
        "Identificador já vinculado a outro produto",
      );
    }
    throw new DomainError(
      "INVALID_CONVERSION",
      400,
      "Conversão duplicada para a mesma unidade",
    );
  }
  throw error;
}

async function ensureActiveReferences(
  tx: Prisma.TransactionClient,
  categoryId: string,
  baseUnitId: string,
) {
  const [category, unit] = await Promise.all([
    tx.category.findFirst({ where: { id: categoryId, active: true } }),
    tx.unitOfMeasure.findFirst({ where: { id: baseUnitId, active: true } }),
  ]);

  if (!category) throw notFound("Categoria não encontrada ou inativa");
  if (!unit) throw notFound("Unidade base não encontrada ou inativa");
}

async function validateConversions(
  tx: Prisma.TransactionClient,
  baseUnitId: string,
  conversions: Array<{ unitId: string; factorToBase: number }>,
) {
  const unitIds = conversions.map((conversion) => conversion.unitId);
  const uniqueIds = new Set(unitIds);

  if (uniqueIds.size !== unitIds.length) {
    throw new DomainError(
      "INVALID_CONVERSION",
      400,
      "Uma unidade alternativa não pode ser repetida",
    );
  }

  if (unitIds.includes(baseUnitId)) {
    throw new DomainError(
      "INVALID_CONVERSION",
      400,
      "A unidade base não pode ser uma conversão alternativa",
    );
  }

  if (conversions.some((conversion) => conversion.factorToBase <= 0)) {
    throw new DomainError(
      "INVALID_CONVERSION",
      400,
      "Fator de conversão deve ser maior que zero",
    );
  }

  if (unitIds.length === 0) return;

  const activeUnits = await tx.unitOfMeasure.findMany({
    where: { id: { in: unitIds }, active: true },
    select: { id: true },
  });

  if (activeUnits.length !== uniqueIds.size) {
    throw new DomainError(
      "INVALID_CONVERSION",
      400,
      "Uma ou mais unidades alternativas são inválidas ou inativas",
    );
  }
}

export async function listProducts(query: ProductListQuery = {}) {
  const search = query.q?.trim();

  return prisma.product.findMany({
    where: {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: normalizeCode(search), mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { manufacturer: { contains: search, mode: "insensitive" } },
              {
                identifiers: {
                  some: {
                    normalizedValue: {
                      contains: normalizeIdentifier(search),
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: [{ active: "desc" }, { sku: "asc" }],
  });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) throw notFound();
  return product;
}

export async function resolveProduct(identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  const bySku = await prisma.product.findUnique({
    where: { sku: normalized },
    include: productInclude,
  });
  if (bySku?.active) return bySku;

  const extraIdentifier = await prisma.productIdentifier.findUnique({
    where: { normalizedValue: normalized },
    select: { productId: true },
  });

  if (!extraIdentifier) {
    throw notFound("Nenhum produto encontrado para o código informado");
  }

  const product = await prisma.product.findUnique({
    where: { id: extraIdentifier.productId },
    include: productInclude,
  });
  if (!product?.active) {
    throw notFound("Nenhum produto ativo encontrado para o código informado");
  }
  return product;
}

export async function createProduct(input: CreateProductInput) {
  const parsed = createProductSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      await ensureActiveReferences(tx, parsed.categoryId, parsed.baseUnitId);
      await validateConversions(tx, parsed.baseUnitId, parsed.conversions);

      return tx.product.create({
        data: {
          sku: parsed.sku,
          name: parsed.name,
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
          categoryId: parsed.categoryId,
          baseUnitId: parsed.baseUnitId,
          ...(parsed.manufacturer !== undefined
            ? { manufacturer: parsed.manufacturer }
            : {}),
          trackingMode: parsed.trackingMode,
          identifiers: {
            create: parsed.identifiers.map((identifier) => ({
              type: identifier.type,
              value: identifier.value,
              normalizedValue: normalizeIdentifier(identifier.value),
              ...(identifier.label !== undefined
                ? { label: identifier.label }
                : {}),
            })),
          },
          conversions: {
            create: parsed.conversions.map((conversion) => ({
              unitId: conversion.unitId,
              factorToBase: conversion.factorToBase,
            })),
          },
        },
        include: productInclude,
      });
    });
  } catch (error) {
    return mapProductWriteError(error);
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const parsed = updateProductSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) throw notFound();

      const categoryId = parsed.categoryId ?? existing.categoryId;
      const baseUnitId = parsed.baseUnitId ?? existing.baseUnitId;
      await ensureActiveReferences(tx, categoryId, baseUnitId);

      if (parsed.baseUnitId && parsed.baseUnitId !== existing.baseUnitId) {
        const conflictingConversion = await tx.productUnitConversion.findUnique({
          where: {
            productId_unitId: {
              productId: id,
              unitId: parsed.baseUnitId,
            },
          },
        });
        if (conflictingConversion) {
          throw new DomainError(
            "INVALID_CONVERSION",
            400,
            "Remova a conversão da nova unidade base antes de alterar o produto",
          );
        }
      }

      if (
        parsed.trackingMode !== undefined &&
        parsed.trackingMode !== existing.trackingMode
      ) {
        const historicalMovement = await tx.stockMovementItem.findFirst({
          where: { productId: id },
          select: { id: true },
        });
        if (historicalMovement) {
          throw new DomainError(
            "TRACKING_MODE_LOCKED",
            409,
            "A rastreabilidade não pode ser alterada após a primeira movimentação de estoque",
          );
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(parsed.sku !== undefined ? { sku: parsed.sku } : {}),
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
          ...(parsed.categoryId !== undefined
            ? { categoryId: parsed.categoryId }
            : {}),
          ...(parsed.baseUnitId !== undefined
            ? { baseUnitId: parsed.baseUnitId }
            : {}),
          ...(parsed.manufacturer !== undefined
            ? { manufacturer: parsed.manufacturer }
            : {}),
          ...(parsed.trackingMode !== undefined
            ? { trackingMode: parsed.trackingMode }
            : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        },
        include: productInclude,
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapProductWriteError(error);
  }
}

export async function addProductIdentifier(
  productId: string,
  input: ProductIdentifierInput,
) {
  const parsed = productIdentifierInputSchema.parse(input);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound();

  try {
    return await prisma.productIdentifier.create({
      data: {
        productId,
        type: parsed.type,
        value: parsed.value,
        normalizedValue: normalizeIdentifier(parsed.value),
        ...(parsed.label !== undefined ? { label: parsed.label } : {}),
      },
    });
  } catch (error) {
    return mapProductWriteError(error);
  }
}

export async function removeProductIdentifier(
  productId: string,
  identifierId: string,
) {
  const result = await prisma.productIdentifier.deleteMany({
    where: { id: identifierId, productId },
  });
  if (result.count === 0) throw notFound("Identificador não encontrado");
}

export async function replaceProductConversions(
  productId: string,
  input: ReplaceProductConversionsInput,
) {
  const parsed = replaceProductConversionsSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw notFound();

      await validateConversions(tx, product.baseUnitId, parsed.conversions);
      await tx.productUnitConversion.deleteMany({ where: { productId } });

      if (parsed.conversions.length > 0) {
        await tx.productUnitConversion.createMany({
          data: parsed.conversions.map((conversion) => ({
            productId,
            unitId: conversion.unitId,
            factorToBase: conversion.factorToBase,
          })),
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: productInclude,
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapProductWriteError(error);
  }
}
