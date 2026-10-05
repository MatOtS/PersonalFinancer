import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  annual: "Anual",
};

export function FixedExpensesList({
  items,
}: {
  items: { id: string; name: string; amount: number; frequency: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos fijos</CardTitle>
        <CardDescription>Recurrentes configurados en Ajustes.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border border-border border-t">
          {items.map((item) => (
            <li
              className="flex items-center justify-between gap-3 px-5 py-2.5"
              key={item.id}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate font-medium text-sm">{item.name}</span>
                <Badge className="shrink-0" variant="outline">
                  {FREQUENCY_LABEL[item.frequency] ?? item.frequency}
                </Badge>
              </div>
              <span className="shrink-0 font-medium text-sm tabular-nums">
                {formatCurrency(item.amount)}
              </span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-5 py-8 text-center text-muted-foreground text-sm">
              Sin gastos fijos configurados
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
