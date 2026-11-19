import { describe, expect, it } from "vitest";
import type { CategoryGroups } from "@/data/categories";
import { categoryOptions, subcategoryOptions } from "./movement-form-options";

const GROUPS: CategoryGroups = {
  expense: [
    {
      id: "c-alimentacion",
      name: "alimentación",
      subcategories: [
        { id: "s-super", name: "Supermercado" },
        { id: "s-rest", name: "Restaurantes" },
      ],
    },
    { id: "c-transporte", name: "Transporte", subcategories: [] },
  ],
  income: [{ id: "c-nomina", name: "Nómina", subcategories: [] }],
};

describe("The category list does not depend on the type", () => {
  it("shows the categories of expense and of income together", () => {
    expect(categoryOptions(GROUPS).map((option) => option.value)).toEqual([
      "c-alimentacion",
      "c-nomina",
      "c-transporte",
    ]);
  });

  it("uses the name as the label", () => {
    expect(categoryOptions(GROUPS)[0]).toEqual({
      value: "c-alimentacion",
      label: "alimentación",
    });
  });
});

describe("The lists of the form are ordered alphabetically", () => {
  it("sorts the categories as one list, ignoring capitals and accents", () => {
    const mixed: CategoryGroups = {
      expense: [
        { id: "1", name: "Zapatos", subcategories: [] },
        { id: "2", name: "ñandú", subcategories: [] },
      ],
      income: [{ id: "3", name: "Álamo", subcategories: [] }],
    };
    expect(categoryOptions(mixed).map((option) => option.label)).toEqual([
      "Álamo",
      "ñandú",
      "Zapatos",
    ]);
  });

  it("sorts the subcategories of the category", () => {
    expect(
      subcategoryOptions(GROUPS, "c-alimentacion").map(
        (option) => option.label,
      ),
    ).toEqual(["Restaurantes", "Supermercado"]);
  });
});

describe("A subcategory needs its category", () => {
  it("offers no subcategories until a category is chosen", () => {
    expect(subcategoryOptions(GROUPS, null)).toEqual([]);
  });

  it("offers none for a category without subcategories, or one that does not exist", () => {
    expect(subcategoryOptions(GROUPS, "c-transporte")).toEqual([]);
    expect(subcategoryOptions(GROUPS, "c-gone")).toEqual([]);
  });

  it('puts "Otros" last in the categories and in the subcategories', () => {
    const withOthers: CategoryGroups = {
      expense: [
        {
          id: "1",
          name: "Hogar",
          subcategories: [
            { id: "s1", name: "Otros" },
            { id: "s2", name: "Alquiler" },
            { id: "s3", name: "Zócalos" },
          ],
        },
        { id: "2", name: "otros", subcategories: [] },
        { id: "3", name: "Viajes", subcategories: [] },
      ],
      income: [{ id: "4", name: "Álamo", subcategories: [] }],
    };
    expect(categoryOptions(withOthers).map((o) => o.label)).toEqual([
      "Álamo",
      "Hogar",
      "Viajes",
      "otros",
    ]);
    expect(subcategoryOptions(withOthers, "1").map((o) => o.label)).toEqual([
      "Alquiler",
      "Zócalos",
      "Otros",
    ]);
  });
});
