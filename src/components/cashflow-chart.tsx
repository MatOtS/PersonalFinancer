"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { formatCompactCurrency, formatDayMonth } from "@/lib/format";
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
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

/** One row per day in the selected period. */
export type CashflowRow = {
  date: string;
  ingresos: number;
  gastos: number;
};

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-income)",
  },
  gastos: {
    label: "Gastos",
    color: "var(--chart-expense)",
  },
} satisfies ChartConfig;

const animationConfig = {
  glowWidth: 520,
};

function highlightXFromChartMouseEvent(e: unknown): number | null {
  const ex = e as {
    activeCoordinate?: { x?: number };
    chartX?: number;
  };
  const fromActive = ex.activeCoordinate?.x;
  if (typeof fromActive === "number" && Number.isFinite(fromActive)) {
    return fromActive;
  }
  const legacy = ex.chartX;
  if (typeof legacy === "number" && Number.isFinite(legacy)) {
    return legacy;
  }
  return null;
}

export function CashflowChart({
  data,
  title = "Ingresos vs. gastos",
  description = "Movimientos diarios del periodo seleccionado.",
}: {
  data: CashflowRow[];
  title?: string;
  description?: string;
}) {
  const chartUid = useId().replace(/:/g, "");
  const idMaskGrad = `cashflow-mask-grad-${chartUid}`;
  const idMask = `cashflow-highlight-mask-${chartUid}`;
  const idGradIngresos = `cashflow-grad-ingresos-${chartUid}`;
  const idGradGastos = `cashflow-grad-gastos-${chartUid}`;

  const [xAxis, setXAxis] = useState<number | null>(null);

  /** Net balance trend across the period, shown as the headline delta. */
  const netDeltaPct = useMemo(() => {
    const totalIngresos = data.reduce((sum, r) => sum + r.ingresos, 0);
    const totalGastos = data.reduce((sum, r) => sum + r.gastos, 0);
    if (totalGastos === 0) {
      return totalIngresos > 0 ? 100 : 0;
    }
    return ((totalIngresos - totalGastos) / totalGastos) * 100;
  }, [data]);

  return (
    <Card className="rounded-none border-0 bg-background py-4 shadow-none ring-0 lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {data.length > 0 && (
                <Delta value={netDeltaPct} variant="badge">
                  <DeltaIcon variant="trend" />
                  <DeltaValue />
                </Delta>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-muted-foreground text-xs">
            {Object.entries(chartConfig).map(([key, cfg]) => (
              <span className="flex items-center gap-1.5" key={key}>
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex aspect-21/9 min-h-48 items-center justify-center text-muted-foreground text-sm">
            Sin movimientos en este periodo
          </div>
        ) : (
          <ChartContainer className="aspect-21/9 min-h-48 w-full p-0" config={chartConfig}>
            <AreaChart
              data={data}
              margin={{ left: 4, right: 12, top: 8 }}
              onMouseLeave={() => setXAxis(null)}
              onMouseMove={(e) => setXAxis(highlightXFromChartMouseEvent(e))}
            >
              <CartesianGrid className="stroke-border" strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                interval="preserveStartEnd"
                minTickGap={32}
                tickFormatter={(value) => formatDayMonth(String(value))}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      formatCompactCurrency(Number(value)),
                      chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                    ]}
                    labelFormatter={(label) => formatDayMonth(String(label))}
                  />
                }
                cursor={false}
              />

              <defs>
                <linearGradient id={idMaskGrad} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="28%" stopColor="white" stopOpacity={0.55} />
                  <stop offset="50%" stopColor="white" />
                  <stop offset="72%" stopColor="white" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id={idGradIngresos} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-ingresos)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-ingresos)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={idGradGastos} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-gastos)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-gastos)" stopOpacity={0} />
                </linearGradient>
                {typeof xAxis === "number" && Number.isFinite(xAxis) ? (
                  <mask id={idMask}>
                    <rect
                      fill={`url(#${idMaskGrad})`}
                      height="100%"
                      width={animationConfig.glowWidth}
                      x={xAxis - animationConfig.glowWidth / 2}
                      y={0}
                    />
                  </mask>
                ) : null}
              </defs>
              <Area
                dataKey="ingresos"
                fill={`url(#${idGradIngresos})`}
                fillOpacity={0.4}
                mask={`url(#${idMask})`}
                stroke="var(--color-ingresos)"
                strokeWidth={0.8}
                type="linear"
              />
              <Area
                dataKey="gastos"
                fill={`url(#${idGradGastos})`}
                fillOpacity={0.4}
                mask={`url(#${idMask})`}
                stroke="var(--color-gastos)"
                strokeWidth={0.8}
                type="linear"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
