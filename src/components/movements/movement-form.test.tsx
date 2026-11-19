import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CategoryGroups } from "@/data/categories";
import { MovementForm } from "./movement-form";

const ACCOUNTS = [{ id: "a1", name: "BBVA", openingBalanceCents: 0 }];
const CATEGORIES: CategoryGroups = {
  expense: [{ id: "c1", name: "Alimentación", subcategories: [] }],
  income: [],
};

const render = (accounts = ACCOUNTS) =>
  renderToStaticMarkup(
    <MovementForm
      accounts={accounts}
      categories={CATEGORIES}
      today="2026-11-18"
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );

describe("The form asks for all the data of a movement", () => {
  const html = render();

  it.each([
    ["the type", "Gasto"],
    ["the type", "Ingreso"],
    ["the amount", "Importe"],
    ["the date", "Fecha"],
    ["the description", "Descripción"],
    ["the account", "Cuenta"],
    ["the category", "Categoría"],
    ["the subcategory", "Subcategoría"],
    ["personal or freelance", "Personal"],
    ["personal or freelance", "Freelance"],
    ["the fixed mark", "Movimiento fijo"],
  ])("asks for %s (%s)", (_what, label) => {
    expect(html).toContain(label);
  });

  it("has the button to save", () => {
    expect(html).toContain("Guardar");
  });
});

describe("The date starts as today", () => {
  it("shows today's date in the date field", () => {
    expect(render()).toMatch(/type="date"[^>]*value="2026-11-18"/);
  });
});

describe("Everything else starts empty", () => {
  const html = render();

  it("has no type, no personal or freelance chosen and the fixed mark unmarked", () => {
    expect(html).not.toMatch(/checked=""/);
  });

  it("has empty amount and description", () => {
    expect(html).toMatch(/name="amount"[^>]*value=""/);
    expect(html).toMatch(/name="description"[^>]*value=""/);
  });

  it("shows the placeholders of the lists", () => {
    expect(html).toContain("Elige una cuenta");
    expect(html).toContain("Elige una categoría");
  });
});

describe("A subcategory needs its category", () => {
  it("has the subcategory list disabled until a category is chosen", () => {
    const html = render();
    expect(html).toMatch(/Subcategoría/);
    expect(html).toMatch(
      /<button[^>]*disabled[^>]*>[^<]*(<[^>]+>)*[^<]*Elige una subcategoría/,
    );
  });
});

describe("A user with no accounts is taken to create one", () => {
  it("shows a notice and a link to the accounts section of the settings", () => {
    const html = render([]);
    expect(html).toContain("Aún no tienes cuentas");
    expect(html).toMatch(
      /<a[^>]*href="\/ajustes#cuentas"[^>]*>[^<]*Añadir cuenta/,
    );
  });

  it("shows no notice when there are accounts", () => {
    expect(render()).not.toContain("Aún no tienes cuentas");
  });
});
