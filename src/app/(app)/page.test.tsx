import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAccounts } from "@/data/accounts";
import { listCategories } from "@/data/categories";
import { listFixedExpenses } from "@/data/fixed-expenses";
import { listBalanceMovements, listMovements } from "@/data/movements";
import HomePage from "./page";

// The page is rendered to HTML text on the server side only, so these tests
// need no browser: they check what the user would read.
vi.mock("@/data/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/data/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/data/fixed-expenses", () => ({ listFixedExpenses: vi.fn() }));
vi.mock("@/data/movements", () => ({
  listMovements: vi.fn(),
  listBalanceMovements: vi.fn(),
}));
// The client parts need the router and the actions; they are not under test.
vi.mock("@/components/dashboard/period-picker", () => ({
  PeriodPicker: () => null,
}));
vi.mock("@/components/movements/movements-panel", () => ({
  MovementsPanel: ({ movements }: { movements: unknown[] }) =>
    `movimientos: ${movements.length}`,
}));

const page = async (params: { from?: string; to?: string } = {}) =>
  renderToStaticMarkup(
    await HomePage({ searchParams: Promise.resolve(params) }),
  );

const move = (
  kind: "expense" | "income",
  amountCents: number,
  categoryId: string | null = null,
) => ({
  id: `${kind}${amountCents}`,
  kind,
  amountCents,
  date: "2026-11-10",
  description: null,
  accountId: "a1",
  categoryId,
  subcategoryId: null,
  workKind: "personal" as const,
  isFixed: false,
  clientId: null,
  source: "manual",
});

beforeEach(() => {
  vi.mocked(listAccounts).mockReset().mockResolvedValue([]);
  vi.mocked(listCategories)
    .mockReset()
    .mockResolvedValue({
      expense: [{ id: "c1", name: "Hogar", subcategories: [] }],
      income: [],
    });
  vi.mocked(listFixedExpenses).mockReset().mockResolvedValue([]);
  vi.mocked(listMovements).mockReset().mockResolvedValue([]);
  vi.mocked(listBalanceMovements).mockReset().mockResolvedValue([]);
});

describe("HomePage without accounts", () => {
  it("offers 'Añadir cuenta', pointing to the accounts section", async () => {
    const html = await page();
    expect(html).toContain("Añadir cuenta");
    expect(html).toContain('href="/ajustes#cuentas"');
  });
});

describe("HomePage with accounts", () => {
  beforeEach(() => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "a1", name: "BBVA", openingBalanceCents: 10000 },
    ]);
  });

  it("does not offer 'Añadir cuenta'", async () => {
    expect(await page()).not.toContain("Añadir cuenta");
  });

  it("shows the incomes, the expenses and the balance of the period", async () => {
    vi.mocked(listMovements).mockResolvedValue([
      move("income", 150000),
      move("expense", 30000, "c1"),
    ]);
    const html = await page({ from: "2026-11-01", to: "2026-11-30" });
    expect(html).toContain("1.500,00 €");
    expect(html).toContain("300,00 €");
    expect(html).toContain("1.200,00 €");
    expect(html).toContain("movimientos: 2");
    expect(vi.mocked(listMovements)).toHaveBeenCalledWith({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("shows the expenses by category, and says so when there are none", async () => {
    vi.mocked(listMovements).mockResolvedValue([move("expense", 30000, "c1")]);
    expect(await page()).toContain("Hogar");
    vi.mocked(listMovements).mockResolvedValue([]);
    expect(await page()).toContain("Sin gastos en este periodo");
  });

  it("shows the balance of each account over all its movements, not only the period", async () => {
    vi.mocked(listBalanceMovements).mockResolvedValue([
      { accountId: "a1", kind: "income", amountCents: 5000 },
      { accountId: "a1", kind: "expense", amountCents: 2000 },
    ]);
    // opening 100,00 + 50,00 - 20,00
    expect(await page()).toContain("130,00 €");
  });

  it("lists the fixed expenses, or says there are none", async () => {
    expect(await page()).toContain("Sin gastos fijos configurados");
    vi.mocked(listFixedExpenses).mockResolvedValue([
      { id: "f1", name: "Alquiler", amountCents: 80000, frequency: "monthly" },
    ]);
    const html = await page();
    expect(html).toContain("Alquiler");
    expect(html).toContain("Mensual");
    expect(html).toContain("800,00 €");
  });
});
