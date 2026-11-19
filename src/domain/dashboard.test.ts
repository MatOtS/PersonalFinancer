import { describe, expect, it } from "vitest";
import {
  accountBalances,
  cashFlowByDay,
  expensesByCategory,
  incomeByClient,
  matchPreset,
  periodFrom,
  presetRange,
  summarize,
  type DashboardMovement,
} from "./dashboard";

const move = (
  kind: "expense" | "income",
  amountCents: number,
  extra: Partial<DashboardMovement> = {},
): DashboardMovement => ({
  kind,
  amountCents,
  date: "2026-11-10",
  categoryId: null,
  clientId: null,
  accountId: "a1",
  ...extra,
});

describe("The totals of a period", () => {
  it("adds the incomes, adds the expenses and the balance is the difference", () => {
    const totals = summarize([
      move("income", 100000),
      move("income", 50000),
      move("expense", 30000),
    ]);
    expect(totals).toEqual({
      incomeCents: 150000,
      expenseCents: 30000,
      balanceCents: 120000,
      avgIncomeCents: 75000,
      avgExpenseCents: 30000,
    });
  });

  it("with no movements everything is zero, with no division by zero", () => {
    expect(summarize([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      avgIncomeCents: 0,
      avgExpenseCents: 0,
    });
  });

  it("an expense bigger than the incomes gives a negative balance", () => {
    expect(
      summarize([move("expense", 500), move("income", 200)]).balanceCents,
    ).toBe(-300);
  });
});

describe("Expenses by category", () => {
  const names: Record<string, string> = { c1: "Hogar", c2: "Ocio" };
  it("adds by category, biggest first, and counts no category apart", () => {
    const slices = expensesByCategory(
      [
        move("expense", 1000, { categoryId: "c2" }),
        move("expense", 5000, { categoryId: "c1" }),
        move("expense", 700, { categoryId: "c1" }),
        move("expense", 300),
        move("income", 99999, { categoryId: "c1" }),
      ],
      (id) => names[id],
    );
    expect(slices).toEqual([
      { name: "Hogar", valueCents: 5700 },
      { name: "Ocio", valueCents: 1000 },
      { name: "Sin categoría", valueCents: 300 },
    ]);
  });

  it("a category that no longer exists counts as no category", () => {
    expect(
      expensesByCategory(
        [move("expense", 100, { categoryId: "gone" })],
        () => undefined,
      ),
    ).toEqual([{ name: "Sin categoría", valueCents: 100 }]);
  });
});

describe("Income by client", () => {
  it("only counts incomes with a client", () => {
    expect(
      incomeByClient(
        [
          move("income", 1000, { clientId: "k1" }),
          move("income", 500, { clientId: "k1" }),
          move("income", 700),
          move("expense", 900, { clientId: "k1" }),
        ],
        (id) => (id === "k1" ? "Acme" : undefined),
      ),
    ).toEqual([{ name: "Acme", valueCents: 1500 }]);
  });
});

describe("Cash flow by day", () => {
  it("groups by day, oldest first", () => {
    expect(
      cashFlowByDay([
        move("expense", 300, { date: "2026-11-12" }),
        move("income", 1000, { date: "2026-11-10" }),
        move("expense", 200, { date: "2026-11-10" }),
      ]),
    ).toEqual([
      { date: "2026-11-10", incomeCents: 1000, expenseCents: 200 },
      { date: "2026-11-12", incomeCents: 0, expenseCents: 300 },
    ]);
  });
});

describe("The balance of an account", () => {
  it("is the opening balance plus the incomes minus the expenses of all its movements", () => {
    expect(
      accountBalances(
        [
          { id: "a1", name: "BBVA", openingBalanceCents: 10000 },
          { id: "a2", name: "Wise", openingBalanceCents: 0 },
        ],
        [
          { accountId: "a1", kind: "income", amountCents: 5000 },
          { accountId: "a1", kind: "expense", amountCents: 2500 },
          { accountId: "a2", kind: "expense", amountCents: 100 },
        ],
      ),
    ).toEqual([
      { id: "a1", name: "BBVA", balanceCents: 12500 },
      { id: "a2", name: "Wise", balanceCents: -100 },
    ]);
  });
});

describe("The period", () => {
  it("the presets count back from today", () => {
    expect(presetRange("week", "2026-11-19")).toEqual({
      from: "2026-11-12",
      to: "2026-11-19",
    });
    expect(presetRange("month", "2026-11-19")).toEqual({
      from: "2026-10-19",
      to: "2026-11-19",
    });
    expect(presetRange("quarter", "2026-11-19")).toEqual({
      from: "2026-08-19",
      to: "2026-11-19",
    });
  });

  it("from the 31st a month back lands on the last day of the shorter month", () => {
    expect(presetRange("month", "2026-03-31").from).toBe("2026-02-28");
    expect(presetRange("month", "2026-01-31").from).toBe("2025-12-31");
  });

  it("knows which preset a range is", () => {
    expect(matchPreset("2026-10-19", "2026-11-19", "2026-11-19")).toBe("month");
    expect(matchPreset("2026-01-01", "2026-11-19", "2026-11-19")).toBeNull();
  });

  it("starts as the last month, and uses the dates of the address when they are real and in order", () => {
    expect(periodFrom({}, "2026-11-19")).toEqual({
      from: "2026-10-19",
      to: "2026-11-19",
    });
    expect(
      periodFrom({ from: "2026-01-01", to: "2026-02-01" }, "2026-11-19"),
    ).toEqual({
      from: "2026-01-01",
      to: "2026-02-01",
    });
    expect(
      periodFrom({ from: "2026-02-31", to: "2026-03-01" }, "2026-11-19").to,
    ).toBe("2026-11-19");
    expect(
      periodFrom({ from: "2026-05-01", to: "2026-04-01" }, "2026-11-19").to,
    ).toBe("2026-11-19");
  });
});
