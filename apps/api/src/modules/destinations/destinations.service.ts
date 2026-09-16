import { Prisma, prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  createDepartmentSchema,
  createEquipmentSchema,
  createWorkOrderSchema,
  updateDepartmentSchema,
  updateEquipmentSchema,
  updateWorkOrderSchema,
  type CreateDepartmentInput,
  type CreateEquipmentInput,
  type CreateWorkOrderInput,
  type EquipmentListQuery,
  type UpdateDepartmentInput,
  type UpdateEquipmentInput,
  type UpdateWorkOrderInput,
  type WorkOrderListQuery,
} from "./destinations.schemas.js";

function notFound(message: string) {
  return new DomainError("NOT_FOUND", 404, message);
}

function mapDuplicate(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DomainError(
      "DUPLICATE_DESTINATION_CODE",
      409,
      "Já existe um destino com este código no escopo informado",
    );
  }
  throw error;
}

async function requireActiveDepartment(
  tx: Prisma.TransactionClient,
  departmentId: string,
) {
  const department = await tx.department.findUnique({
    where: { id: departmentId },
    select: { id: true, active: true },
  });
  if (!department) throw notFound("Setor não encontrado");
  if (!department.active) {
    throw new DomainError(
      "DESTINATION_PARENT_INACTIVE",
      409,
      "O setor informado está inativo",
    );
  }
  return department;
}

async function requireCompatibleEquipment(
  tx: Prisma.TransactionClient,
  equipmentId: string,
  departmentId: string,
) {
  const equipment = await tx.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, departmentId: true, active: true },
  });
  if (!equipment) throw notFound("Equipamento não encontrado");
  if (!equipment.active) {
    throw new DomainError(
      "DESTINATION_PARENT_INACTIVE",
      409,
      "O equipamento informado está inativo",
    );
  }
  if (equipment.departmentId !== departmentId) {
    throw new DomainError(
      "INVALID_DESTINATION_RELATION",
      400,
      "O equipamento não pertence ao setor informado",
    );
  }
  return equipment;
}

export function listDepartments() {
  return prisma.department.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }, { code: "asc" }],
  });
}

export async function createDepartment(input: CreateDepartmentInput) {
  const parsed = createDepartmentSchema.parse(input);
  try {
    return await prisma.department.create({ data: parsed });
  } catch (error) {
    return mapDuplicate(error);
  }
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
) {
  const parsed = updateDepartmentSchema.parse(input);
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw notFound("Setor não encontrado");

  const data: Prisma.DepartmentUpdateInput = {
    ...(parsed.code !== undefined ? { code: parsed.code } : {}),
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.active !== undefined ? { active: parsed.active } : {}),
  };

  try {
    return await prisma.department.update({ where: { id }, data });
  } catch (error) {
    return mapDuplicate(error);
  }
}

export function listEquipment(query: EquipmentListQuery = {}) {
  return prisma.equipment.findMany({
    where: {
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    },
    include: { department: true },
    orderBy: [{ active: "desc" }, { code: "asc" }],
  });
}

export async function createEquipment(input: CreateEquipmentInput) {
  const parsed = createEquipmentSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      await requireActiveDepartment(tx, parsed.departmentId);
      return tx.equipment.create({
        data: {
          departmentId: parsed.departmentId,
          code: parsed.code,
          name: parsed.name,
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapDuplicate(error);
  }
}

export async function updateEquipment(
  id: string,
  input: UpdateEquipmentInput,
) {
  const parsed = updateEquipmentSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.equipment.findUnique({ where: { id } });
      if (!existing) throw notFound("Equipamento não encontrado");

      const departmentId = parsed.departmentId ?? existing.departmentId;
      if (parsed.departmentId !== undefined) {
        await requireActiveDepartment(tx, departmentId);
      }

      return tx.equipment.update({
        where: { id },
        data: {
          ...(parsed.departmentId !== undefined ? { departmentId } : {}),
          ...(parsed.code !== undefined ? { code: parsed.code } : {}),
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapDuplicate(error);
  }
}

export function listWorkOrders(query: WorkOrderListQuery = {}) {
  return prisma.workOrder.findMany({
    where: {
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    },
    include: { department: true, equipment: true },
    orderBy: [{ active: "desc" }, { code: "asc" }],
  });
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const parsed = createWorkOrderSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      await requireActiveDepartment(tx, parsed.departmentId);
      if (parsed.equipmentId) {
        await requireCompatibleEquipment(
          tx,
          parsed.equipmentId,
          parsed.departmentId,
        );
      }

      return tx.workOrder.create({
        data: {
          code: parsed.code,
          departmentId: parsed.departmentId,
          ...(parsed.equipmentId !== undefined
            ? { equipmentId: parsed.equipmentId }
            : {}),
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapDuplicate(error);
  }
}

export async function updateWorkOrder(
  id: string,
  input: UpdateWorkOrderInput,
) {
  const parsed = updateWorkOrderSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.workOrder.findUnique({ where: { id } });
      if (!existing) throw notFound("Ordem de serviço não encontrada");

      const departmentId = parsed.departmentId ?? existing.departmentId;
      const equipmentId =
        parsed.equipmentId === undefined
          ? existing.equipmentId
          : parsed.equipmentId;

      if (parsed.departmentId !== undefined) {
        await requireActiveDepartment(tx, departmentId);
      }
      if (equipmentId) {
        await requireCompatibleEquipment(tx, equipmentId, departmentId);
      }

      return tx.workOrder.update({
        where: { id },
        data: {
          ...(parsed.code !== undefined ? { code: parsed.code } : {}),
          ...(parsed.departmentId !== undefined ? { departmentId } : {}),
          ...(parsed.equipmentId !== undefined ? { equipmentId } : {}),
          ...(parsed.description !== undefined
            ? { description: parsed.description }
            : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return mapDuplicate(error);
  }
}
