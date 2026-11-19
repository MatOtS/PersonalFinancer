"use client";

import { Cell, Pie, PieChart } from "recharts";
import { useMounted } from "@/components/ui/use-mounted";
import { formatCents } from "@/domain/money";
import type { Slice } from "@/domain/dashboard";

const COLORS = Array.from({ length: 8 }, (_, i) => `var(--cat-${i + 1})`);
// The same colors as classes: an inline `style` is blocked by the policy.
const SWATCHES = [
  "bg-[var(--cat-1)]",
  "bg-[var(--cat-2)]",
  "bg-[var(--cat-3)]",
  "bg-[var(--cat-4)]",
  "bg-[var(--cat-5)]",
  "bg-[var(--cat-6)]",
  "bg-[var(--cat-7)]",
  "bg-[var(--cat-8)]",
];
const MAX_SLICES = COLORS.length;

// More than eight slices: the smallest fold into "Otros" (never a ninth color).
export function foldSlices(slices: Slice[]): Slice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const head = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1);
  return [
    ...head,
    {
      name: "Otros",
      valueCents: rest.reduce((sum, s) => sum + s.valueCents, 0),
    },
  ];
}

// A donut with its figures as text beside it, in the same order as the
// colors: the color never carries the information alone (`docs/design.md`).
export const SlicesChart = ({
  title,
  slices,
  emptyText,
}: {
  title: string;
  slices: Slice[];
  emptyText: string;
}) => {
  const mounted = useMounted();
  const shown = foldSlices(slices);
  const total = shown.reduce((sum, s) => sum + s.valueCents, 0);

  return (
    <section
      aria-label={title}
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 className="text-h2 font-semibold">{title}</h2>
      {shown.length === 0 ? (
        <p className="mt-4 text-small text-text-muted">{emptyText}</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div aria-hidden="true" className="size-[180px]">
            {mounted && (
              <PieChart width={180} height={180}>
                <Pie
                  data={shown}
                  dataKey="valueCents"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {shown.map((slice, index) => (
                    <Cell key={slice.name} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </div>
          <table className="min-w-64 flex-1 text-small">
            <caption className="sr-only">{title}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Importe</th>
                <th scope="col">Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((slice, index) => (
                <tr key={slice.name}>
                  <td className="py-1 pr-3">
                    <span
                      aria-hidden="true"
                      className={`mr-2 inline-block size-3 rounded-full align-middle ${SWATCHES[index]}`}
                    />
                    {slice.name}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums">
                    {formatCents(slice.valueCents)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-text-muted">
                    {Math.round((slice.valueCents / total) * 100)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
