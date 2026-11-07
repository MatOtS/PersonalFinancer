import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { nameKey, validateName } from "./names";

const ofKind = (kind: "expense" | "income") =>
  DEFAULT_CATEGORIES.filter((category) => category.kind === kind);

// Scenario: A new user starts with the default categories and no accounts.
describe("DEFAULT_CATEGORIES", () => {
  it("has 11 expense categories with these subcategories", () => {
    const expenses = ofKind("expense").map(({ name, subcategories }) => [
      name,
      subcategories,
    ]);
    expect(expenses).toEqual([
      ["Vivienda", ["Alquiler/Hipoteca", "Comunidad", "Mantenimiento"]],
      ["Suministros", ["Luz", "Agua", "Gas", "Internet"]],
      ["Alimentación", ["Supermercado", "Restaurantes"]],
      [
        "Transporte",
        ["Combustible", "Transporte público", "Mantenimiento vehículo"],
      ],
      ["Ocio", ["Salidas", "Viajes", "Hobbies"]],
      ["Suscripciones", ["Streaming", "Software personal"]],
      ["Material/Equipo freelance", ["Hardware", "Herramientas"]],
      ["Software", ["Licencias", "SaaS"]],
      ["Impuestos", ["IRPF", "IVA", "Autónomos"]],
      ["Salud", ["Seguro médico", "Farmacia"]],
      ["Otros", []],
    ]);
  });

  it("has 26 subcategories in total", () => {
    const total = DEFAULT_CATEGORIES.flatMap((c) => c.subcategories).length;
    expect(total).toBe(26);
  });

  it("has 4 income categories and none has subcategories", () => {
    const income = ofKind("income");
    expect(income.map((category) => category.name)).toEqual([
      "Facturación",
      "Nómina",
      "Devoluciones",
      "Otros ingresos",
    ]);
    expect(income.every((c) => c.subcategories.length === 0)).toBe(true);
  });

  // The defaults obey the same name rules as anything the user types, or the
  // database would refuse them.
  it("only has valid names, with no repeats where the rules forbid them", () => {
    const names = DEFAULT_CATEGORIES.flatMap((c) => [
      c.name,
      ...c.subcategories,
    ]);
    expect(names.filter((name) => validateName(name) !== null)).toEqual([]);

    for (const kind of ["expense", "income"] as const) {
      const keys = ofKind(kind).map((c) => nameKey(c.name));
      expect(new Set(keys).size).toBe(keys.length);
    }
    for (const category of DEFAULT_CATEGORIES) {
      const keys = category.subcategories.map(nameKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
