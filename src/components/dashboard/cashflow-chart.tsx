"use client";

import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { useMounted } from "@/components/ui/use-mounted";
import type { DayFlow } from "@/domain/dashboard";
import { formatCents } from "@/domain/money";

const formatDay = (iso: string) =>
  iso.split("-").reverse().slice(0, 2).join("/");

// Incomes and expenses day by day. The figures of each day are also in a table
// for screen readers (the chart itself is hidden from them).
export const CashflowChart = ({
  days,
  title = "Flujo de caja",
  emptyText = "Sin movimientos en este periodo",
}: {
  days: DayFlow[];
  title?: string;
  emptyText?: string;
}) => {
  const mounted = useMounted();
  const data = days.map((day) => ({
    day: formatDay(day.date),
    Ingresos: day.incomeCents / 100,
    Gastos: day.expenseCents / 100,
  }));

  return (
    <section
      aria-label={title}
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 className="text-h2 font-semibold">{title}</h2>
      {days.length === 0 ? (
        <p className="mt-4 text-small text-text-muted">{emptyText}</p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-4 h-[220px] overflow-x-auto">
            {mounted && (
              <BarChart
                width={Math.max(480, days.length * 48)}
                height={220}
                data={data}
              >
                <XAxis
                  dataKey="day"
                  stroke="var(--text-muted)"
                  tickLine={false}
                />
                <YAxis stroke="var(--text-muted)" tickLine={false} width={60} />
                <Tooltip
                  formatter={(value) =>
                    formatCents(Math.round(Number(value) * 100))
                  }
                  contentStyle={{
                    background: "var(--raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="Ingresos"
                  fill="var(--positive)"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="Gastos"
                  fill="var(--negative)"
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </div>
          <div
            className="mt-2 flex gap-4 text-small text-text-muted"
            aria-hidden="true"
          >
            <span>
              <span className="mr-1 inline-block size-3 rounded-full bg-positive align-middle" />
              Ingresos
            </span>
            <span>
              <span className="mr-1 inline-block size-3 rounded-full bg-negative align-middle" />
              Gastos
            </span>
          </div>
          <table className="sr-only">
            <caption>{title}, día a día</caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Ingresos</th>
                <th scope="col">Gastos</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <td>{day.date.split("-").reverse().join("/")}</td>
                  <td>{formatCents(day.incomeCents)}</td>
                  <td>{formatCents(day.expenseCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
};
