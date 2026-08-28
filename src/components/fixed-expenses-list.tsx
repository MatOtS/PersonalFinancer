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
    <div className="rounded-lg border border-border">
      <p className="border-b border-border px-4 py-3 text-sm font-medium">
        Gastos fijos
      </p>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div>
              <p>{item.name}</p>
              <p className="text-xs text-muted-foreground">{FREQUENCY_LABEL[item.frequency] ?? item.frequency}</p>
            </div>
            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin gastos fijos configurados</li>
        )}
      </ul>
    </div>
  );
}
