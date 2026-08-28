import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  amount: number;
  irpf_pct: number;
  iva_pct: number;
  net_amount: number;
  issued: boolean;
  paid: boolean;
  client: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <Card className="rounded-none bg-background shadow-none ring ring-border">
      <CardHeader>
        <CardTitle>Facturación</CardTitle>
        <CardDescription>Todas tus facturas emitidas.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <Table className="border-t">
            <TableCaption className="sr-only">
              Facturas con cliente, fecha, número, importe, IRPF, IVA y estado.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>N.º factura</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">IRPF</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-center">Emitida</TableHead>
                <TableHead className="pr-6 text-right">Cobrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="max-w-40 truncate pl-6 font-medium">
                    {one(inv.client)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(inv.issue_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {inv.invoice_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatCurrency(inv.amount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatPercent(inv.irpf_pct)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatPercent(inv.iva_pct)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                    {formatCurrency(inv.net_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={inv.issued ? "secondary" : "outline"}>
                      {inv.issued ? "Sí" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {inv.paid ? (
                      <Badge variant="secondary">Cobrada</Badge>
                    ) : (
                      <MarkPaidButton invoiceId={inv.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={9}>
                    Sin facturas todavía
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
