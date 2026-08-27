import { formatCurrency, formatDate } from "@/lib/format";

interface MovementRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: { name: string } | { name: string }[] | null;
  subcategory: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function MovementsTable({ movements }: { movements: MovementRow[] }) {
  const expenses = movements.filter((m) => m.amount < 0);

  return (
    <details className="rounded-lg border border-neutral-200 dark:border-neutral-800" open>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Gastos del periodo ({expenses.length})
      </summary>
      <div className="max-h-72 overflow-y-auto border-t border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Descripción</th>
              <th className="px-4 py-2 font-medium">Cuenta</th>
              <th className="px-4 py-2 font-medium">Subcategoría</th>
              <th className="px-4 py-2 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((m) => (
              <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-900">
                <td className="whitespace-nowrap px-4 py-2">{formatDate(m.date)}</td>
                <td className="px-4 py-2">{m.description}</td>
                <td className="whitespace-nowrap px-4 py-2">{one(m.account)?.name ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-2">{one(m.subcategory)?.name ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                  {formatCurrency(m.amount)}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Sin gastos en este periodo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}
