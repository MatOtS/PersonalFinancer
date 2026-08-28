import { createClient } from "@/lib/supabase/server";
import {
  getMovements,
  summarize,
  groupByCategory,
  getIncomeByClient,
} from "@/lib/queries/dashboard";
import { getInvoices } from "@/lib/queries/invoices";
import { DateRangePicker } from "@/components/date-range-picker";
import { KpiCard } from "@/components/kpi-card";
import { CategoryBarChart, ClientIncomeBarChart } from "@/components/charts";
import { InvoicesTable } from "@/components/invoices-table";
import { formatCurrency, monthAgoISO, todayISO } from "@/lib/format";

export default async function FreelancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? monthAgoISO();
  const to = params.to ?? todayISO();

  const supabase = await createClient();
  const [movements, incomeByClient, invoices] = await Promise.all([
    getMovements(supabase, { from, to, type: "freelance" }),
    getIncomeByClient(supabase, { from, to }),
    getInvoices(supabase),
  ]);

  const totals = summarize(movements);
  const categoryTotals = groupByCategory(movements);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Freelance</h2>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Entradas" value={formatCurrency(totals.income)} tone="up" />
        <KpiCard label="Salidas" value={formatCurrency(totals.expense)} tone="down" />
        <KpiCard label="Balance" value={formatCurrency(totals.balance)} tone={totals.balance >= 0 ? "up" : "down"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-medium">Gastos freelance por categoría</p>
          <CategoryBarChart data={categoryTotals} />
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-medium">Ingresos por cliente</p>
          <ClientIncomeBarChart data={incomeByClient} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Facturación</p>
        <InvoicesTable invoices={invoices} />
      </div>
    </div>
  );
}
