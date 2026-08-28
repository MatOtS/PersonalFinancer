import { DashboardGrid } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          key={a.account_id}
          className="rounded-none bg-background shadow-none ring-0"
          size="sm"
        >
          <CardHeader>
            <CardTitle className="font-normal text-muted-foreground text-xs tracking-wide">
              {a.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium tabular-nums">{formatCurrency(a.current_balance)}</p>
          </CardContent>
        </Card>
      ))}
    </DashboardGrid>
  );
}
