import { formatCents } from "@/domain/money";

export type Stat = {
  label: string;
  value: string;
  tone?: "positive" | "negative";
};

// Figures with their name above: a row of numbers, not a row of boxes.
export const StatCards = ({ stats }: { stats: Stat[] }) => {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-surface p-5 shadow-card"
        >
          <dt className="text-small text-text-muted">{stat.label}</dt>
          <dd
            className={`mt-1 text-figure font-bold tabular-nums ${
              stat.tone === "positive"
                ? "text-positive"
                : stat.tone === "negative"
                  ? "text-negative"
                  : ""
            }`}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const money = formatCents;
