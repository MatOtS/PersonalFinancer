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
import { InvoiceStatusBadge } from "@/components/invoices-table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/supabase/types";

export interface DashboardInvoiceRow {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  net_amount: number;
  status: InvoiceStatus;
  client: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function DashboardInvoices({
  invoices,
  limit = 5,
}: {
  invoices: DashboardInvoiceRow[];
  limit?: number;
}) {
  const rows = invoices.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas recientes</CardTitle>
        <CardDescription>Importe neto y estado de cobro.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table className="border-t">
          <TableCaption className="sr-only">
            Facturas recientes con cliente, número, importe y estado.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Cliente</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead className="text-right tabular-nums">Neto</TableHead>
              <TableHead className="pr-6 text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inv) => (
              <TableRow className="h-14" key={inv.id}>
                <TableCell className="max-w-32 truncate pl-6 font-medium">
                  {one(inv.client)?.name ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  <span className="block">{inv.invoice_number ?? "Borrador"}</span>
                  <span className="block text-[0.9em]">{formatDate(inv.issue_date)}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(inv.net_amount)}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                  Sin facturas todavía
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
