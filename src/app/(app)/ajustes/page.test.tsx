import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAccounts } from "@/data/accounts";
import { listCategories } from "@/data/categories";
import SettingsPage from "./page";

// Same idea as page.test.tsx of Home: the page is rendered to HTML text.
vi.mock("@/data/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/data/categories", () => ({ listCategories: vi.fn() }));

beforeEach(() => {
  vi.mocked(listAccounts).mockReset();
  vi.mocked(listAccounts).mockResolvedValue([]);
  vi.mocked(listCategories).mockReset();
  vi.mocked(listCategories).mockResolvedValue({ expense: [], income: [] });
});

describe("SettingsPage", () => {
  it("is titled 'Ajustes' and has the section 'Cuentas'", async () => {
    vi.mocked(listAccounts).mockResolvedValue([]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toMatch(/<h1[^>]*>Ajustes<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>Cuentas<\/h2>/);
    expect(html).toContain('id="cuentas"');
  });

  it("lists each account with its opening balance in euros", async () => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "1", name: "BBVA", openingBalanceCents: 125000 },
      { id: "2", name: "Wise", openingBalanceCents: -3500 },
    ]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("BBVA");
    expect(html).toContain("1.250,00 €");
    expect(html).toContain("Wise");
    expect(html).toContain("-35,00 €");
  });

  it("keeps the order the data layer gives, which is alphabetical", async () => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "1", name: "Ahorro", openingBalanceCents: 0 },
      { id: "2", name: "Wise", openingBalanceCents: 0 },
    ]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html.indexOf("Ahorro")).toBeLessThan(html.indexOf("Wise"));
  });
});

describe("SettingsPage categories", () => {
  const groups = {
    expense: [
      {
        id: "c1",
        name: "Alimentación",
        subcategories: [
          { id: "s1", name: "Restaurantes" },
          { id: "s2", name: "Supermercado" },
        ],
      },
      { id: "c2", name: "Ocio", subcategories: [] },
    ],
    income: [{ id: "c3", name: "Nómina", subcategories: [] }],
  };

  it("has the section 'Categorías' with the groups Gastos and Ingresos", async () => {
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toMatch(/<h2[^>]*>Categorías<\/h2>/);
    expect(html).toContain('id="categorias"');
    expect(html).toMatch(/<h3[^>]*>Gastos<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Ingresos<\/h3>/);
  });

  it("lists each category under its group with its subcategories", async () => {
    vi.mocked(listCategories).mockResolvedValue(groups);
    const html = renderToStaticMarkup(await SettingsPage());
    const expenses = html.indexOf("Gastos");
    const income = html.indexOf(">Ingresos<");
    expect(html.indexOf("Alimentación")).toBeGreaterThan(expenses);
    expect(html.indexOf("Alimentación")).toBeLessThan(income);
    expect(html.indexOf("Nómina")).toBeGreaterThan(income);
    expect(html.indexOf("Alimentación")).toBeLessThan(
      html.indexOf("Restaurantes"),
    );
    expect(html.indexOf("Restaurantes")).toBeLessThan(
      html.indexOf("Supermercado"),
    );
    expect(html.indexOf("Supermercado")).toBeLessThan(html.indexOf("Ocio"));
  });

  it("has one add form per group, so the group gives the type", async () => {
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain('aria-label="Añadir categoría de gasto"');
    expect(html).toContain('aria-label="Añadir categoría de ingreso"');
    expect(html).toContain('name="kind" value="expense"');
    expect(html).toContain('name="kind" value="income"');
  });

  it("offers edit, delete and add subcategory on each category, with visible labels", async () => {
    vi.mocked(listCategories).mockResolvedValue(groups);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain('aria-label="Editar Alimentación"');
    expect(html).toContain('aria-label="Eliminar Alimentación"');
    expect(html).toContain('aria-label="Añadir subcategoría a Alimentación"');
    expect(html).toContain('aria-label="Editar Restaurantes"');
    expect(html).toContain('aria-label="Eliminar Restaurantes"');
    // The add forms have a visible label (the placeholder is only a hint).
    expect(html).toMatch(/<label[^>]*>Nombre<\/label>/);
  });

  it("never lets the type be chosen or changed once a category exists", async () => {
    vi.mocked(listCategories).mockResolvedValue(groups);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).not.toContain("<select");
    expect(html).not.toContain('type="radio"');
  });
});
