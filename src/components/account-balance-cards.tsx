import { formatCurrency } from "@/lib/format";

export function AccountBalanceCards({
  accounts,
}: {
  accounts: { account_id: string; name: string; current_balance: number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {accounts.map((a) => (
        <div key={a.account_id} className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{a.name}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(a.current_balance)}</p>
        </div>
      ))}
    </div>
  );
}
