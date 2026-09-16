import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import { DomainError } from "@alma/shared";
import {
  createDepartment,
  createEquipment,
  createWorkOrder,
  updateDepartment,
} from "../src/modules/destinations/destinations.service.js";

async function resetTables() {
  await prisma.approval.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.department.deleteMany();
}

describe("destinos estruturados", () => {
  beforeEach(resetTables);

  it("normaliza código de setor e permite desativação", async () => {
    const department = await createDepartment({
      code: " man ",
      name: "Manutenção",
    });
    expect(department.code).toBe("MAN");

    const inactive = await updateDepartment(department.id, { active: false });
    expect(inactive.active).toBe(false);
  });

  it("cadastra equipamento apenas em setor ativo", async () => {
    const department = await createDepartment({ code: "PROD", name: "Produção" });
    const equipment = await createEquipment({
      departmentId: department.id,
      code: " mp-01 ",
      name: "Máquina de Papel 01",
    });
    expect(equipment.code).toBe("MP-01");

    await updateDepartment(department.id, { active: false });
    await expect(
      createEquipment({
        departmentId: department.id,
        code: "MP-02",
        name: "Máquina de Papel 02",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "DESTINATION_PARENT_INACTIVE",
        status: 409,
      }),
    );
  });

  it("mantém OS coerente com setor e equipamento", async () => {
    const maintenance = await createDepartment({ code: "MAN", name: "Manutenção" });
    const production = await createDepartment({ code: "PROD", name: "Produção" });
    const machine = await createEquipment({
      departmentId: production.id,
      code: "MP-01",
      name: "Máquina de Papel 01",
    });

    await expect(
      createWorkOrder({
        code: "OS-100",
        departmentId: maintenance.id,
        equipmentId: machine.id,
        description: "Troca de rolamento",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "INVALID_DESTINATION_RELATION",
        status: 400,
      }),
    );
  });

  it("rejeita códigos duplicados com conflito semântico", async () => {
    await createDepartment({ code: "MAN", name: "Manutenção" });

    await expect(
      createDepartment({ code: " man ", name: "Manutenção 2" }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({
        code: "DUPLICATE_DESTINATION_CODE",
        status: 409,
      }),
    );
  });
});
