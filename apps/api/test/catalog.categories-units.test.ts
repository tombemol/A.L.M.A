import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@alma/database";
import {
  createCategory,
  updateCategory,
} from "../src/modules/catalog/categories.service.js";
import {
  createUnit,
} from "../src/modules/catalog/units.service.js";

describe("categorias e unidades", () => {
  beforeEach(async () => {
    await prisma.productUnitConversion.deleteMany();
    await prisma.productIdentifier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unitOfMeasure.deleteMany();
  });

  it("normaliza códigos e cria hierarquia de categorias", async () => {
    const parent = await createCategory({ code: " mec ", name: "Mecânica" });
    const child = await createCategory({
      code: " rol ",
      name: "Rolamentos",
      parentId: parent.id,
    });

    expect(parent.code).toBe("MEC");
    expect(child.code).toBe("ROL");
    expect(child.parentId).toBe(parent.id);
  });

  it("rejeita ciclo de categoria", async () => {
    const parent = await createCategory({ code: "MEC", name: "Mecânica" });
    const child = await createCategory({
      code: "ROL",
      name: "Rolamentos",
      parentId: parent.id,
    });

    await expect(
      updateCategory(parent.id, { parentId: child.id }),
    ).rejects.toMatchObject({ code: "CATEGORY_CYCLE", status: 409 });
  });

  it("normaliza unidade e rejeita código duplicado", async () => {
    const unit = await createUnit({
      code: " kg ",
      name: "Quilograma",
      symbol: "kg",
      allowsDecimal: true,
    });

    expect(unit.code).toBe("KG");

    await expect(
      createUnit({
        code: "kg",
        name: "Outro quilograma",
        symbol: "kg",
        allowsDecimal: true,
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_CODE", status: 409 });
  });
});
