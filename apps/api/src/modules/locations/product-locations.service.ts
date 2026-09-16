import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  associateProductLocationSchema,
  type AssociateProductLocationInput,
} from "./locations.schemas.js";

const associationInclude = {
  warehouse: true,
  location: true,
} satisfies Prisma.ProductLocationInclude;

function notFound(message: string) {
  return new DomainError("NOT_FOUND", 404, message);
}

async function loadAssociationContext(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string,
) {
  const [product, location] = await Promise.all([
    tx.product.findFirst({
      where: { id: productId, active: true },
      select: { id: true },
    }),
    tx.storageLocation.findFirst({
      where: { id: locationId, active: true },
      include: {
        warehouse: { select: { id: true, active: true } },
      },
    }),
  ]);

  if (!product) throw notFound("Produto não encontrado ou inativo");
  if (!location) throw notFound("Localização não encontrada ou inativa");
  if (!location.warehouse.active) {
    throw notFound("Almoxarifado não encontrado ou inativo");
  }
  if (location.kind !== "POSITION") {
    throw new DomainError(
      "INVALID_PRIMARY_LOCATION",
      400,
      "Produtos só podem ser associados a posições físicas",
    );
  }

  return { product, location };
}

export async function listProductLocations(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw notFound("Produto não encontrado");

  return prisma.productLocation.findMany({
    where: { productId },
    include: associationInclude,
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function associateProductLocation(
  productId: string,
  input: AssociateProductLocationInput,
) {
  const parsed = associateProductLocationSchema.parse(input);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const { location } = await loadAssociationContext(
          tx,
          productId,
          parsed.locationId,
        );

        if (location.occupancyMode === "DEDICATED") {
          const occupiedByAnotherProduct = await tx.productLocation.findFirst({
            where: {
              locationId: location.id,
              productId: { not: productId },
            },
            select: { id: true },
          });

          if (occupiedByAnotherProduct) {
            throw new DomainError(
              "DEDICATED_LOCATION_OCCUPIED",
              409,
              "A posição dedicada já está vinculada a outro produto",
            );
          }
        }

        if (parsed.isPrimary) {
          await tx.productLocation.updateMany({
            where: {
              productId,
              warehouseId: location.warehouseId,
              isPrimary: true,
            },
            data: { isPrimary: false },
          });
        }

        return tx.productLocation.upsert({
          where: {
            productId_locationId: {
              productId,
              locationId: location.id,
            },
          },
          update: {
            warehouseId: location.warehouseId,
            isPrimary: parsed.isPrimary,
          },
          create: {
            productId,
            warehouseId: location.warehouseId,
            locationId: location.id,
            isPrimary: parsed.isPrimary,
          },
          include: associationInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof DomainError) throw error;

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DomainError(
        "INVALID_PRIMARY_LOCATION",
        409,
        "Já existe uma localização principal para este produto no almoxarifado",
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new DomainError(
        "CONCURRENT_LOCATION_UPDATE",
        409,
        "A posição foi alterada por outra operação. Tente novamente",
      );
    }

    throw error;
  }
}

export async function removeProductLocation(
  productId: string,
  associationId: string,
) {
  const result = await prisma.productLocation.deleteMany({
    where: { id: associationId, productId },
  });

  if (result.count === 0) {
    throw notFound("Associação de localização não encontrada");
  }
}
