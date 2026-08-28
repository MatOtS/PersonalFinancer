import { formatCurrency, formatDate } from "@/lib/format";
import { MarkPaidButton } from "@/components/mark-paid-button";

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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Cliente</th>
            <th className="px-4 py-2 font-medium">Fecha</th>
            <th className="px-4 py-2 font-medium">N.º factura</th>
            <th className="px-4 py-2 text-right font-medium">Importe</th>
            <th className="px-4 py-2 text-center font-medium">Emitida</th>
            <th className="px-4 py-2 text-center font-medium">Cobrada</th>
            <th className="px-4 py-2 text-right font-medium">Monto neto</th>
            <th className="px-4 py-2 text-right font-medium">IRPF</th>
            <th className="px-4 py-2 text-right font-medium">IVA</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-border">
              <td className="whitespace-nowrap px-4 py-2">{one(inv.client)?.name ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-2">{formatDate(inv.issue_date)}</td>
              <td className="whitespace-nowrap px-4 py-2">{inv.invoice_number}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatCurrency(inv.amount)}</td>
              <td className="px-4 py-2 text-center">{inv.issued ? "Sí" : "No"}</td>
              <td className="px-4 py-2 text-center">
                {inv.paid ? "Sí" : <MarkPaidButton invoiceId={inv.id} />}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatCurrency(inv.net_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{inv.irpf_pct}%</td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{inv.iva_pct}%</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                Sin facturas todavía
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
