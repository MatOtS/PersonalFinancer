import type React from "react";
import { cn } from "@/lib/utils";
import { microLabel } from "@/lib/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

export type Stat = {
  label: string;
  value: string;
  /** Percentage change vs. the comparison period. Omit to hide the delta. */
  delta?: number;
  /** Sets the colour of the rule; the default is the neutral accent. */
  tone?: "brand" | "income" | "expense";
};

const TONE_RULE: Record<NonNullable<Stat["tone"]>, string> = {
  brand: "bg-brand",
  income: "bg-[var(--chart-income)]",
  expense: "bg-[var(--chart-expense)]",
};

export function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <>
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </>
  );
}

/**
 * A figure with its name above it and a short rule marking the top-left corner.
 * The rule is the only colour on the card, so a row of KPIs reads as a row of
 * numbers rather than a row of boxes.
 */
function StatCard({
  stat,
  className,
  ...props
}: React.ComponentProps<typeof Card> & { stat: Stat }) {
  const { label, value, delta, tone = "brand" } = stat;

  return (
    <Card
      className={cn(
        "relative gap-0 rounded-none bg-background pt-5 shadow-none ring-0",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        // Flush with the panel edge and aligned to the card padding, so it reads
        // as a marker on the top rule rather than a floating dash.
        className={cn("absolute top-0 left-(--card-spacing) h-0.5 w-6", TONE_RULE[tone])}
      />
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1.5">
        <span className={microLabel}>{label}</span>
        {delta !== undefined && (
          <span className="flex items-center gap-1 text-xs tabular-nums">
            <Delta value={delta}>
              <DeltaIcon />
              <DeltaValue />
            </Delta>
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
