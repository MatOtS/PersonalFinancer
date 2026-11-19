import { describe, expect, it } from "vitest";
import { applyPatch, buildPatch, type PatchableRow } from "./bulk-edit";

const input = (field: string, value: string, subcategory = "") => ({
  field,
  value,
  subcategory,
});

const ROW: PatchableRow = {
  date: "2026-11-10",
  description: "cena",
  amountCents: 1250,
  kind: "expense",
  accountId: "a1",
  categoryId: "c1",
  subcategoryId: "s1",
  workKind: "personal",
  isFixed: false,
};

describe("Building the change of a bulk edit", () => {
  it.each([
    [input("date", "2026-12-01"), { date: "2026-12-01" }],
    [input("description", "  nueva  "), { description: "nueva" }],
    [input("description", "   "), { description: null }],
    [input("amount", "12,50"), { amountCents: 1250 }],
    [input("amount", "0"), { amountCents: 0 }],
    [input("kind", "income"), { kind: "income" }],
    [input("account", "a2"), { accountId: "a2" }],
    [input("workKind", "freelance"), { workKind: "freelance" }],
    [input("isFixed", "yes"), { isFixed: true }],
    [input("isFixed", "no"), { isFixed: false }],
    [input("category", "c2", "s2"), { categoryId: "c2", subcategoryId: "s2" }],
    [input("category", "c2"), { categoryId: "c2", subcategoryId: null }],
    [input("category", ""), { categoryId: null, subcategoryId: null }],
  ])("%j", (typed, patch) => {
    expect(buildPatch(typed)).toEqual({ patch });
  });

  it.each([
    [input("date", "2026-02-31"), "Introduce una fecha válida"],
    [input("date", ""), "Introduce una fecha válida"],
    [input("amount", "-5"), "Introduce un importe válido"],
    [input("amount", ""), "El importe no puede estar vacío"],
    [
      input("description", "a".repeat(201)),
      "La descripción es demasiado larga (máximo 200 caracteres)",
    ],
    [input("kind", "other"), "Elige tipo de movimiento"],
    [input("account", ""), "Debes elegir una cuenta"],
    [input("workKind", ""), "Elige personal o freelance"],
    [input("isFixed", ""), "Elige si es fijo"],
    [input("nothing", "x"), "Elige el campo que quieres cambiar"],
  ])("%j is refused with its message", (typed, error) => {
    expect(buildPatch(typed)).toEqual({ error });
  });
});

describe("Writing the change in a row", () => {
  it("changes only what the patch says", () => {
    expect(applyPatch(ROW, { workKind: "freelance" })).toEqual({
      ...ROW,
      workKind: "freelance",
    });
  });

  it("a new category without subcategory clears the old subcategory", () => {
    expect(applyPatch(ROW, { categoryId: "c2" })).toMatchObject({
      categoryId: "c2",
      subcategoryId: null,
    });
  });

  it("a new category with its subcategory keeps both", () => {
    expect(
      applyPatch(ROW, { categoryId: "c2", subcategoryId: "s2" }),
    ).toMatchObject({
      categoryId: "c2",
      subcategoryId: "s2",
    });
  });

  it("does not change the row it was given", () => {
    const before = { ...ROW };
    applyPatch(ROW, { amountCents: 1 });
    expect(ROW).toEqual(before);
  });
});
