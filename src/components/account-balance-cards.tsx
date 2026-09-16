import { DashboardGrid } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { microLabel } from "@/lib/ui";
import { formatCurrency } from "@/lib/format";

export function AccountBalanceCards({
  accounts,
}: {
  accounts: { account_id: string; name: string; current_balance: number }[];
}) {
  return (
    <DashboardGrid className="sm:grid-cols-3 lg:grid-cols-5">
      {accounts.map((a) => (
        <Card
          className="gap-1 rounded-none bg-background shadow-none ring-0"
          key={a.account_id}
          size="sm"
        >
          <CardHeader className="flex flex-row items-center gap-2">
            {/* A balance in the red is worth seeing before reading the figure. */}
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                a.current_balance < 0 ? "bg-[var(--chart-expense)]" : "bg-[var(--chart-income)]"
              }`}
            />
            <span className={`${microLabel} truncate`}>{a.name}</span>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg tabular-nums tracking-tight">
              {formatCurrency(a.current_balance)}
            </p>
          </CardContent>
        </Card>
      ))}
    </DashboardGrid>
  );
}
