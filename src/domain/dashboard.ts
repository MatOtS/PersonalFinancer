// The numbers of the dashboards (work items 011 and 012): totals of a period,
// the expenses by category, the cash flow by day, the balance of each account
// and the income by client. Pure functions over movements; money is integer
// cents (ADR-06). An expense subtracts and an income adds (the amount of a
// movement is always positive, the type says which).
import { divideRoundHalfEven } from "./rounding";

export type DashboardMovement = {
  kind: "expense" | "income";
  amountCents: number;
  date: string;
  categoryId: string | null;
  clientId: string | null;
  accountId: string;
};

export type Summary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  // The average of the incomes (or the expenses) of the period, 0 with none.
  avgIncomeCents: number;
  avgExpenseCents: number;
};

const sum = (items: { amountCents: number }[]) =>
  items.reduce((total, item) => total + item.amountCents, 0);
const average = (total: number, count: number) =>
  count === 0 ? 0 : divideRoundHalfEven(total, count);

export function summarize(movements: DashboardMovement[]): Summary {
  const incomes = movements.filter((m) => m.kind === "income");
  const expenses = movements.filter((m) => m.kind === "expense");
  const incomeCents = sum(incomes);
  const expenseCents = sum(expenses);
  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    avgIncomeCents: average(incomeCents, incomes.length),
    avgExpenseCents: average(expenseCents, expenses.length),
  };
}

export const NO_CATEGORY = "Sin categoría";
export const NO_CLIENT = "Sin cliente";

export type Slice = { name: string; valueCents: number };

const bySize = (a: Slice, b: Slice) =>
  b.valueCents - a.valueCents || a.name.localeCompare(b.name, "es");

// The expenses of the period by category, the biggest first. An expense with no
// category (or whose category is gone) goes to "Sin categoría".
export function expensesByCategory(
  movements: DashboardMovement[],
  categoryName: (id: string) => string | undefined,
): Slice[] {
  const totals = new Map<string, number>();
  for (const movement of movements) {
    if (movement.kind !== "expense") continue;
    const name =
      (movement.categoryId && categoryName(movement.categoryId)) || NO_CATEGORY;
    totals.set(name, (totals.get(name) ?? 0) + movement.amountCents);
  }
  return [...totals]
    .map(([name, valueCents]) => ({ name, valueCents }))
    .sort(bySize);
}

// The incomes that have a client, by client, the biggest first.
export function incomeByClient(
  movements: DashboardMovement[],
  clientName: (id: string) => string | undefined,
): Slice[] {
  const totals = new Map<string, number>();
  for (const movement of movements) {
    if (movement.kind !== "income" || !movement.clientId) continue;
    const name = clientName(movement.clientId) ?? NO_CLIENT;
    totals.set(name, (totals.get(name) ?? 0) + movement.amountCents);
  }
  return [...totals]
    .map(([name, valueCents]) => ({ name, valueCents }))
    .sort(bySize);
}

export type DayFlow = {
  date: string;
  incomeCents: number;
  expenseCents: number;
};

// Incomes and expenses day by day, oldest first.
export function cashFlowByDay(movements: DashboardMovement[]): DayFlow[] {
  const days = new Map<string, DayFlow>();
  for (const movement of movements) {
    const day = days.get(movement.date) ?? {
      date: movement.date,
      incomeCents: 0,
      expenseCents: 0,
    };
    if (movement.kind === "income") day.incomeCents += movement.amountCents;
    else day.expenseCents += movement.amountCents;
    days.set(movement.date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type AccountBalance = { id: string; name: string; balanceCents: number };

// The opening balance plus the incomes minus the expenses of every movement of
// the account, of any date.
export function accountBalances(
  accounts: { id: string; name: string; openingBalanceCents: number }[],
  movements: {
    accountId: string;
    kind: "expense" | "income";
    amountCents: number;
  }[],
): AccountBalance[] {
  return accounts.map((account) => {
    const own = movements.filter((m) => m.accountId === account.id);
    const incomes = own.filter((m) => m.kind === "income");
    const expenses = own.filter((m) => m.kind === "expense");
    return {
      id: account.id,
      name: account.name,
      balanceCents: account.openingBalanceCents + sum(incomes) - sum(expenses),
    };
  });
}

// The periods the user can pick with one press, counted back from today.
export type PeriodPreset = "week" | "month" | "quarter";
export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "week", label: "Última semana" },
  { id: "month", label: "Último mes" },
  { id: "quarter", label: "Último trimestre" },
];

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// `today` is a yyyy-mm-dd date (in Madrid). Months are calendar months: from
// the 31st it lands on the nearest valid day of the earlier month.
export function presetRange(
  preset: PeriodPreset,
  today: string,
): { from: string; to: string } {
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, day));
  if (preset === "week") from.setUTCDate(from.getUTCDate() - 7);
  else {
    const months = preset === "month" ? 1 : 3;
    const target = month - 1 - months;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    from.setUTCFullYear(year, target, Math.min(day, lastDay));
  }
  return { from: isoDate(from), to: today };
}

export function matchPreset(
  from: string,
  to: string,
  today: string,
): PeriodPreset | null {
  return (
    PERIOD_PRESETS.find((preset) => {
      const range = presetRange(preset.id, today);
      return range.from === from && range.to === to;
    })?.id ?? null
  );
}

// The period of the page: the dates of the address when both are real and in
// order, the last month otherwise.
export function periodFrom(
  params: { from?: string; to?: string },
  today: string,
): { from: string; to: string } {
  const real = (value: string | undefined) =>
    value !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isoDate(new Date(`${value}T00:00:00Z`)) === value;
  if (real(params.from) && real(params.to) && params.from! <= params.to!) {
    return { from: params.from!, to: params.to! };
  }
  return presetRange("month", today);
}
