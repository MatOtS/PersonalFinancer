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
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <p className="border-b border-neutral-200 px-4 py-3 text-sm font-medium dark:border-neutral-800">
        Gastos fijos
      </p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div>
              <p>{item.name}</p>
              <p className="text-xs text-neutral-500">{FREQUENCY_LABEL[item.frequency] ?? item.frequency}</p>
            </div>
            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-400">Sin gastos fijos configurados</li>
        )}
      </ul>
    </div>
  );
}
