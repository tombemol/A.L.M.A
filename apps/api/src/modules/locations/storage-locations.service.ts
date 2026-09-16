import {
  Prisma,
  prisma,
  type StorageLocationKind,
  type OccupancyMode,
} from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  createStorageLocationSchema,
  normalizeLocationCode,
  updateStorageLocationSchema,
  type CreateStorageLocationInput,
  type UpdateStorageLocationInput,
} from "./locations.schemas.js";

export const LOCATION_ORDER: Record<StorageLocationKind, number> = {
  AISLE: 1,
  RACK: 2,
  SHELF: 3,
  POSITION: 4,
};

function invalidParent(message: string) {
  return new DomainError("INVALID_LOCATION_PARENT", 400, message);
}

function normalizeOccupancy(
  kind: StorageLocationKind,
  occupancyMode: OccupancyMode | null | undefined,
): OccupancyMode | null {
  if (kind === "POSITION") {
    if (!occupancyMode) {
      throw new DomainError(
        "INVALID_LOCATION",
        400,
        "Uma posição deve informar se é dedicada ou compartilhada",
      );
    }
    return occupancyMode;
  }

  if (occupancyMode) {
    throw new DomainError(
      "INVALID_LOCATION",
      400,
      "Somente posições podem definir modo de ocupação",
    );
  }

  return null;
}

function mapLocationWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DomainError(
      "DUPLICATE_CODE",
      409,
      "Já existe uma localização com este código neste almoxarifado",
    );
  }
  throw error;
}

async function requireActiveWarehouse(
  tx: Prisma.TransactionClient,
  warehouseId: string,
) {
  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, active: true },
    select: { id: true },
  });
  if (!warehouse) {
    throw new DomainError(
      "NOT_FOUND",
      404,
      "Almoxarifado não encontrado ou inativo",
    );
  }
}

async function assertParentAllowed(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  childKind: StorageLocationKind,
  parentId: string | null | undefined,
  locationId?: string,
) {
  if (!parentId) return;

  let currentId: string | null = parentId;
  let immediateParentKind: StorageLocationKind | null = null;
  const visited = new Set<string>();

  while (currentId) {
    if (locationId && currentId === locationId) {
      throw new DomainError(
        "LOCATION_CYCLE",
        409,
        "Uma localização não pode ser descendente de si mesma",
      );
    }

    if (visited.has(currentId)) {
      throw new DomainError(
        "LOCATION_CYCLE",
        409,
        "A hierarquia de localizações contém um ciclo",
      );
    }
    visited.add(currentId);

    const current: {
      id: string;
      warehouseId: string;
      parentId: string | null;
      kind: StorageLocationKind;
    } | null = await tx.storageLocation.findUnique({
      where: { id: currentId },
      select: { id: true, warehouseId: true, parentId: true, kind: true },
    });

    if (!current || current.warehouseId !== warehouseId) {
      throw invalidParent(
        "A localização pai deve existir no mesmo almoxarifado",
      );
    }

    if (immediateParentKind === null) {
      immediateParentKind = current.kind;
    }

    currentId = current.parentId;
  }

  if (
    immediateParentKind !== null &&
    LOCATION_ORDER[immediateParentKind] >= LOCATION_ORDER[childKind]
  ) {
    throw invalidParent(
      "A localização pai deve estar em um nível anterior ao nível filho",
    );
  }
}

export async function listStorageLocations(warehouseId: string) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true },
  });
  if (!warehouse) {
    throw new DomainError("NOT_FOUND", 404, "Almoxarifado não encontrado");
  }

  const locations = await prisma.storageLocation.findMany({
    where: { warehouseId },
    orderBy: [{ kind: "asc" }, { code: "asc" }],
  });

  const byId = new Map(locations.map((location) => [location.id, location]));

  return locations.map((location) => {
    const parts: string[] = [];
    let current = location;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      parts.unshift(current.code);
      if (!current.parentId) break;
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }

    return { ...location, path: parts.join(" / ") };
  });
}

export async function createStorageLocation(
  warehouseId: string,
  input: CreateStorageLocationInput,
) {
  const parsed = createStorageLocationSchema.parse(input);
  const occupancyMode = normalizeOccupancy(parsed.kind, parsed.occupancyMode);

  try {
    return await prisma.$transaction(async (tx) => {
      await requireActiveWarehouse(tx, warehouseId);
      await assertParentAllowed(
        tx,
        warehouseId,
        parsed.kind,
        parsed.parentId,
      );

      return tx.storageLocation.create({
        data: {
          warehouseId,
          kind: parsed.kind,
          code: normalizeLocationCode(parsed.code),
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.parentId !== undefined ? { parentId: parsed.parentId } : {}),
          occupancyMode,
        },
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapLocationWriteError(error);
  }
}

export async function updateStorageLocation(
  id: string,
  input: UpdateStorageLocationInput,
) {
  const parsed = updateStorageLocationSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.storageLocation.findUnique({
        where: { id },
        include: {
          children: { select: { id: true, kind: true } },
          _count: { select: { productLocations: true } },
        },
      });
      if (!existing) {
        throw new DomainError("NOT_FOUND", 404, "Localização não encontrada");
      }

      const nextKind = parsed.kind ?? existing.kind;
      const nextParentId =
        parsed.parentId !== undefined ? parsed.parentId : existing.parentId;
      const requestedOccupancyMode =
        parsed.occupancyMode !== undefined
          ? parsed.occupancyMode
          : nextKind === existing.kind
            ? existing.occupancyMode
            : null;
      const nextOccupancyMode = normalizeOccupancy(
        nextKind,
        requestedOccupancyMode,
      );

      await assertParentAllowed(
        tx,
        existing.warehouseId,
        nextKind,
        nextParentId,
        id,
      );

      for (const child of existing.children) {
        if (LOCATION_ORDER[nextKind] >= LOCATION_ORDER[child.kind]) {
          throw invalidParent(
            "O novo nível é incompatível com uma localização filha existente",
          );
        }
      }

      if (nextKind !== "POSITION" && existing._count.productLocations > 0) {
        throw new DomainError(
          "INVALID_LOCATION",
          409,
          "Uma posição vinculada a produtos não pode mudar para outro nível",
        );
      }

      const data: Prisma.StorageLocationUpdateInput = {
        ...(parsed.kind !== undefined ? { kind: parsed.kind } : {}),
        ...(parsed.code !== undefined
          ? { code: normalizeLocationCode(parsed.code) }
          : {}),
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.parentId !== undefined
          ? parsed.parentId === null
            ? { parent: { disconnect: true } }
            : { parent: { connect: { id: parsed.parentId } } }
          : {}),
        ...(parsed.kind !== undefined || parsed.occupancyMode !== undefined
          ? { occupancyMode: nextOccupancyMode }
          : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      };

      return tx.storageLocation.update({ where: { id }, data });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapLocationWriteError(error);
  }
}
