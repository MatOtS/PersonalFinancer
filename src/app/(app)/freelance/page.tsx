import Link from "next/link";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { SlicesChart } from "@/components/dashboard/slices-chart";
import { StatCards } from "@/components/dashboard/stat-cards";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { buttonClassName } from "@/components/ui/button";
import { listClients } from "@/data/clients";
import { listInvoices } from "@/data/invoices";
import { listMovements } from "@/data/movements";
import {
  cashFlowByDay,
  incomeByClient,
  periodFrom,
  summarize,
} from "@/domain/dashboard";
import { formatCents } from "@/domain/money";
import { todayInMadrid } from "@/domain/movements";

export default async function FreelancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const today = todayInMadrid();
  const { from, to } = periodFrom(await searchParams, today);

  const [movements, clients, invoices] = await Promise.all([
    listMovements({ from, to, workKind: "freelance" }),
    listClients(),
    listInvoices(),
  ]);

  const rows = movements.map((m) => ({
    kind: m.kind,
    amountCents: m.amountCents,
    date: m.date,
    categoryId: m.categoryId,
    clientId: m.clientId,
    accountId: m.accountId,
  }));
  const totals = summarize(rows);
  const clientNames = new Map(clients.map((c) => [c.id, c.name]));

  // Only an issued invoice is money owed to the user; a draft was not sent.
  const pending = invoices.filter((invoice) => invoice.status === "issued");
  const pendingCents = pending.reduce(
    (sum, invoice) => sum + invoice.netCents,
    0,
  );
  const drafts = invoices.filter(
    (invoice) => invoice.status === "draft",
  ).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1 font-bold">Freelance</h1>
        <PeriodPicker from={from} to={to} today={today} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <StatCards
          stats={[
            {
              label: "Entradas",
              value: formatCents(totals.incomeCents),
              tone: "positive",
            },
            {
              label: "Salidas",
              value: formatCents(totals.expenseCents),
              tone: "negative",
            },
            { label: "Balance", value: formatCents(totals.balanceCents) },
          ]}
        />
        <CashflowChart
          title="Flujo de caja freelance"
          days={cashFlowByDay(rows)}
          emptyText="Sin movimientos freelance en este periodo"
        />
        <StatCards
          stats={[
            {
              label: "Facturas pendientes de cobro",
              value: String(pending.length),
            },
            { label: "Importe pendiente", value: formatCents(pendingCents) },
            { label: "Borradores", value: String(drafts) },
          ]}
        />
        <SlicesChart
          title="Ingresos por cliente"
          slices={incomeByClient(rows, (id) => clientNames.get(id))}
          emptyText="Sin ingresos por cliente en este periodo"
        />

        <section
          aria-label="Facturas"
          className="rounded-lg border border-border bg-surface p-6 shadow-card"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-h2 font-semibold">Facturas</h2>
            <Link href="/facturas/nueva" className={buttonClassName("primary")}>
              Nueva factura
            </Link>
          </div>
          <InvoicesTable invoices={invoices} today={today} />
        </section>
      </div>
    </>
  );
}
