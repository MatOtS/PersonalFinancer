import { ChartLineUpIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { SlicesChart } from "@/components/dashboard/slices-chart";
import { StatCards } from "@/components/dashboard/stat-cards";
import { MovementsPanel } from "@/components/movements/movements-panel";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAccounts } from "@/data/accounts";
import { listCategories } from "@/data/categories";
import { listFixedExpenses } from "@/data/fixed-expenses";
import { listBalanceMovements, listMovements } from "@/data/movements";
import {
  accountBalances,
  cashFlowByDay,
  expensesByCategory,
  periodFrom,
  summarize,
} from "@/domain/dashboard";
import { frequencyLabel } from "@/domain/fixed-expenses";
import { formatCents } from "@/domain/money";
import { todayInMadrid } from "@/domain/movements";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const today = todayInMadrid();
  const { from, to } = periodFrom(await searchParams, today);

  const [accounts, categories, movements, balanceMovements, fixedExpenses] =
    await Promise.all([
      listAccounts(),
      listCategories(),
      listMovements({ from, to }),
      listBalanceMovements(),
      listFixedExpenses(),
    ]);

  if (accounts.length === 0) {
    return (
      <>
        <h1 className="text-h1 font-bold">Inicio</h1>
        <div className="mt-6 rounded-lg border border-border bg-surface shadow-card">
          <EmptyState
            icon={<ChartLineUpIcon size={20} />}
            text="Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos."
            action={
              <Link
                href="/ajustes#cuentas"
                className={buttonClassName("primary")}
              >
                Añadir cuenta
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const names = new Map<string, string>();
  for (const category of [...categories.expense, ...categories.income]) {
    names.set(category.id, category.name);
  }
  const rows = movements.map((m) => ({
    kind: m.kind,
    amountCents: m.amountCents,
    date: m.date,
    categoryId: m.categoryId,
    clientId: m.clientId,
    accountId: m.accountId,
  }));
  const totals = summarize(rows);
  const balances = accountBalances(accounts, balanceMovements);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1 font-bold">Inicio</h1>
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
        <SlicesChart
          title="Gastos por categoría"
          slices={expensesByCategory(rows, (id) => names.get(id))}
          emptyText="Sin gastos en este periodo"
        />
        <CashflowChart days={cashFlowByDay(rows)} />
        <StatCards
          stats={[
            {
              label: "Promedio de ingresos",
              value: formatCents(totals.avgIncomeCents),
            },
            {
              label: "Promedio de gastos",
              value: formatCents(totals.avgExpenseCents),
            },
          ]}
        />

        <section
          aria-label="Saldo de las cuentas"
          className="rounded-lg border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="text-h2 font-semibold">Saldo de las cuentas</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {balances.map((account) => (
              <li
                key={account.id}
                className="rounded-md border border-border p-4"
              >
                <p className="text-small text-text-muted">{account.name}</p>
                <p className="mt-1 text-figure font-bold tabular-nums">
                  {formatCents(account.balanceCents)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Gastos fijos"
          className="rounded-lg border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="text-h2 font-semibold">Gastos fijos</h2>
          {fixedExpenses.length === 0 ? (
            <p className="mt-4 text-small text-text-muted">
              Sin gastos fijos configurados
            </p>
          ) : (
            <ul className="mt-4">
              {fixedExpenses.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-small text-text-muted">
                    {frequencyLabel(item.frequency)}
                  </span>
                  <span className="ml-auto tabular-nums">
                    {formatCents(item.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <MovementsPanel
          title="Movimientos del periodo"
          emptyText="Sin movimientos en este periodo"
          movements={movements}
          accounts={accounts}
          categories={categories}
          today={today}
        />
      </div>
    </>
  );
}
