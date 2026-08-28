import { createClient } from "@/lib/supabase/server";
import { getMovements, summarize, groupByDate, getIncomeByClient } from "@/lib/queries/dashboard";
import { getInvoices } from "@/lib/queries/invoices";
import { DateRangePicker } from "@/components/date-range-picker";
import { DashboardGrid, DashboardHeading } from "@/components/dashboard-layout";
import { DashboardStats } from "@/components/stats";
import { CashflowChart } from "@/components/cashflow-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { DashboardInvoices } from "@/components/dashboard-invoices";
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
  const timeSeries = groupByDate(movements);
  const pendingInvoices = invoices.filter((i) => !i.paid);
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.net_amount, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <DashboardHeading
        title="Freelance"
        subtitle="Ingresos por cliente y estado de tu facturación."
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
        <CashflowChart
          data={timeSeries}
          description="Movimientos freelance del periodo seleccionado."
        />
      </DashboardGrid>

      <DashboardGrid className="lg:grid-cols-2">
        <DashboardStats
          stats={[
            { label: "Facturas pendientes de cobro", value: String(pendingInvoices.length) },
            { label: "Importe pendiente", value: formatCurrency(pendingAmount) },
          ]}
        />
      </DashboardGrid>

      <DashboardGrid className="lg:grid-cols-2">
        <CategoryBreakdown
          data={incomeByClient}
          description="Cobros freelance del periodo seleccionado."
          emptyLabel="Sin ingresos por cliente en este periodo"
          title="Ingresos por cliente"
        />
        <DashboardInvoices invoices={invoices} />
      </DashboardGrid>

      <InvoicesTable invoices={invoices} />
    </div>
  );
}
