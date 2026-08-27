import { createClient } from "@/lib/supabase/server";
import {
  getAccountBalances,
  getMovements,
  getFixedExpenses,
  summarize,
  groupByCategory,
  groupByDate,
} from "@/lib/queries/dashboard";
import { DateRangePicker } from "@/components/date-range-picker";
import { KpiCard } from "@/components/kpi-card";
import { AccountBalanceCards } from "@/components/account-balance-cards";
import { MovementsTable } from "@/components/movements-table";
import { FixedExpensesList } from "@/components/fixed-expenses-list";
import { IncomeExpenseLineChart, CategoryBarChart } from "@/components/charts";
import { formatCurrency, monthAgoISO, todayISO } from "@/lib/format";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? monthAgoISO();
  const to = params.to ?? todayISO();

  const supabase = await createClient();
  const [accounts, movements, fixedExpenses] = await Promise.all([
    getAccountBalances(supabase),
    getMovements(supabase, { from, to }),
    getFixedExpenses(supabase),
  ]);

  const totals = summarize(movements);
  const categoryTotals = groupByCategory(movements);
  const timeSeries = groupByDate(movements);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Home</h2>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Entradas" value={formatCurrency(totals.income)} tone="up" />
        <KpiCard label="Salidas" value={formatCurrency(totals.expense)} tone="down" />
        <KpiCard label="Balance" value={formatCurrency(totals.balance)} tone={totals.balance >= 0 ? "up" : "down"} />
        <KpiCard label="Prom. ingresos" value={formatCurrency(totals.avgIncome)} />
        <KpiCard label="Prom. gastos" value={formatCurrency(totals.avgExpense)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-2 text-sm font-medium">Ingresos vs. gastos</p>
          <IncomeExpenseLineChart data={timeSeries} />
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-2 text-sm font-medium">Gastos por categoría</p>
          <CategoryBarChart data={categoryTotals} />
        </div>
      </div>

      <AccountBalanceCards accounts={accounts} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MovementsTable movements={movements} />
        <FixedExpensesList items={fixedExpenses} />
      </div>
    </div>
  );
}
