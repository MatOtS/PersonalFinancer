"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";

export interface DonutSlice {
  name: string;
  value: number;
}

/**
 * Categorical slots, assigned in fixed order and never cycled. The palette is
 * validated for colour-vision deficiency in both themes, and eight is its
 * limit — anything beyond that folds into "Otros" rather than inventing a hue.
 */
const SLOT_VARS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
  "var(--cat-8)",
] as const;

const MAX_SLICES = SLOT_VARS.length;

export function CategoryDonut({
  data,
  title,
  description,
  emptyLabel,
}: {
  data: DonutSlice[];
  title: string;
  description: string;
  emptyLabel: string;
}) {
  const slices = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_SLICES) return sorted;
    const head = sorted.slice(0, MAX_SLICES - 1);
    const rest = sorted.slice(MAX_SLICES - 1);
    return [...head, { name: "Otros", value: rest.reduce((s, d) => s + d.value, 0) }];
  }, [data]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        slices.map((s, i) => [s.name, { label: s.name, color: SLOT_VARS[i] }])
      ) satisfies ChartConfig,
    [slices]
  );

  if (slices.length === 0 || total === 0) {
    return (
      <Card className="rounded-none bg-background shadow-none ring-0">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none bg-background shadow-none ring-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <ChartContainer className="aspect-square h-48 w-48" config={chartConfig}>
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${formatCurrency(Number(value))} · ${((Number(value) / total) * 100).toFixed(1)} %`,
                      name,
                    ]}
                    hideLabel
                  />
                }
              />
              <Pie
                data={slices}
                dataKey="value"
                innerRadius="62%"
                nameKey="name"
                outerRadius="100%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {slices.map((slice, i) => (
                  <Cell fill={SLOT_VARS[i]} key={slice.name} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-muted-foreground text-xs">Total</span>
            <span className="font-medium text-sm tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>

        {/*
          The legend doubles as the visible-label relief the palette validator
          requires: three light-mode slots sit below 3:1 against the surface, so
          identity never rests on colour alone.
        */}
        <ul className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
          {slices.map((slice, i) => (
            <li className="flex items-baseline gap-2" key={slice.name}>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 translate-y-px"
                style={{ backgroundColor: SLOT_VARS[i] }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {((slice.value / total) * 100).toFixed(1)} %
              </span>
              <span className="shrink-0 tabular-nums">{formatCurrency(slice.value)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
