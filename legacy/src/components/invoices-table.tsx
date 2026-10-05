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
import { InvoiceActions } from "@/components/invoice-actions";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/supabase/types";

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  amount: number;
  irpf_pct: number;
  iva_pct: number;
  net_amount: number;
  status: InvoiceStatus;
  client: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  paid: "Cobrada",
};

/**
 * "Emitida" is the state that needs attention (sent, not collected yet), so it
 * carries the loudest badge; a draft is quiet and a cobrada is settled.
 */
const STATUS_VARIANT: Record<InvoiceStatus, "outline" | "secondary" | "default"> = {
  draft: "outline",
  issued: "default",
  paid: "secondary",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <Card className="ring ring-border">
      <CardHeader>
        <CardTitle>Facturación</CardTitle>
        <CardDescription>
          Borradores, facturas emitidas y cobradas. El PDF está disponible desde que se emite.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <Table className="border-t">
            <TableCaption className="sr-only">
              Facturas con cliente, fechas, número, base imponible, IRPF, IVA, total y estado.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>N.º factura</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">IRPF</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="max-w-40 truncate pl-6 font-medium">
                    {one(inv.client)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    <span className="block">{formatDate(inv.issue_date)}</span>
                    {inv.due_date && (
                      <span className="block text-[0.9em]">Vence {formatDate(inv.due_date)}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {inv.invoice_number ?? <span className="text-muted-foreground">Sin asignar</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatCurrency(inv.amount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatPercent(inv.iva_pct)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatPercent(inv.irpf_pct)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                    {formatCurrency(inv.net_amount)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-right">
                    <InvoiceActions id={inv.id} status={inv.status} />
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
