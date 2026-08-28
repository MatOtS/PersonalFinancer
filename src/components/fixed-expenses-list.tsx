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
    <Card className="rounded-none bg-background shadow-none ring-0">
      <CardHeader>
        <CardTitle>Gastos fijos</CardTitle>
        <CardDescription>Recurrentes configurados en Ajustes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{item.name}</span>
              <Badge variant="outline">
                {FREQUENCY_LABEL[item.frequency] ?? item.frequency}
              </Badge>
            </div>
            <span className="shrink-0 tabular-nums">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">
            Sin gastos fijos configurados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
