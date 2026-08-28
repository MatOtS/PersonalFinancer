import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

/**
 * Ranked amounts as a bar-per-row list — reads faster than a chart at this
 * size and keeps the exact figures visible. Used for both spend-by-category
 * and income-by-client.
 */
export function CategoryBreakdown({
  data,
  title = "Gastos por categoría",
  description = "Del periodo seleccionado.",
  emptyLabel = "Sin gastos en este periodo",
}: {
  data: { name: string; value: number }[];
  title?: string;
  description?: string;
  emptyLabel?: string;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);

  return (
    <Card className="rounded-none bg-background shadow-none ring-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.map((item) => (
          <div key={item.name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted">
              <div
                className="h-full bg-[var(--chart-3)]"
                style={{ width: max > 0 ? `${(item.value / max) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
