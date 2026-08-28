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
import { DashboardGrid, DashboardHeading } from "@/components/dashboard-layout";
import { DashboardStats } from "@/components/stats";
import { CashflowChart } from "@/components/cashflow-chart";
import { AccountBalanceCards } from "@/components/account-balance-cards";
import { MovementsTable } from "@/components/movements-table";
import { FixedExpensesList } from "@/components/fixed-expenses-list";
import { CategoryBreakdown } from "@/components/category-breakdown";
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
    <div className="flex flex-1 flex-col gap-6 py-6">
      <DashboardHeading
        title="Finanzas personales"
        subtitle="Entradas, salidas y saldo de tus cuentas."
        actions={<DateRangePicker from={from} to={to} />}
      />

      <DashboardGrid>
        <DashboardStats
          stats={[
            { label: "Entradas", value: formatCurrency(totals.income) },
            { label: "Salidas", value: formatCurrency(totals.expense) },
            { label: "Balance", value: formatCurrency(totals.balance) },
          ]}
        />
        <CashflowChart data={timeSeries} />
      </DashboardGrid>

      <DashboardGrid className="lg:grid-cols-2">
        <DashboardStats
          stats={[
            { label: "Promedio de ingresos", value: formatCurrency(totals.avgIncome) },
            { label: "Promedio de gastos", value: formatCurrency(totals.avgExpense) },
          ]}
        />
      </DashboardGrid>

      <AccountBalanceCards accounts={accounts} />

      <DashboardGrid className="lg:grid-cols-2">
        <CategoryBreakdown data={categoryTotals} />
        <FixedExpensesList items={fixedExpenses} />
      </DashboardGrid>

      <MovementsTable movements={movements} />
    </div>
  );
}
