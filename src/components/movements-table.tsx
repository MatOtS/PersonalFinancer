import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Card className="rounded-none bg-background shadow-none ring ring-border">
      <CardHeader>
        <CardTitle>Gastos del periodo</CardTitle>
        <CardDescription>
          {expenses.length} {expenses.length === 1 ? "movimiento" : "movimientos"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="max-h-96 overflow-y-auto">
          <Table className="border-t">
            <TableCaption className="sr-only">
              Gastos del periodo con fecha, descripción, cuenta, subcategoría e importe.
            </TableCaption>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="pl-6">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead className="pr-6 text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap pl-6 text-muted-foreground tabular-nums">
                    {formatDate(m.date)}
                  </TableCell>
                  <TableCell className="max-w-64 truncate font-medium">{m.description}</TableCell>
                  <TableCell className="whitespace-nowrap">{one(m.account)?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {one(m.subcategory)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-right tabular-nums">
                    {formatCurrency(m.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    Sin gastos en este periodo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
