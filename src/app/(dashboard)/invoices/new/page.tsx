import { createClient } from "@/lib/supabase/server";
import { getClients, getUserSettings, nextInvoiceNumber } from "@/lib/queries/invoices";
import { InvoiceForm } from "./invoice-form";
import { createClientAction } from "./actions";
import { Button } from "@/components/ui/button";
import { field } from "@/lib/ui";
import { DashboardHeading } from "@/components/dashboard-layout";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const [clients, settings] = await Promise.all([getClients(supabase), getUserSettings(supabase)]);

  return (
    <div className="space-y-8">
      <DashboardHeading
        eyebrow="Registrar"
        subtitle="Los conceptos, el IVA y el IRPF de la factura."
        title="Emitir factura"
      />

      {!settings.issuer_tax_id && (
        <p className="max-w-3xl rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Todavía no cargaste tus datos de emisor (NIF, dirección, IBAN). La factura se genera
          igual, pero el PDF saldrá incompleto: completalos en{" "}
          <a className="underline" href="/settings">
            Ajustes
          </a>
          .
        </p>
      )}

      <InvoiceForm
        clients={clients}
        defaultDueDays={settings.default_due_days}
        defaultIrpf={settings.default_irpf_pct}
        defaultIva={settings.default_iva_pct}
        nextInvoiceNumber={nextInvoiceNumber(settings.invoice_number_format, settings.invoice_number_next)}
      />

      <details className="max-w-md rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Agregar cliente nuevo</summary>
        <form action={createClientAction} className="mt-3 flex gap-2">
          <input
            name="name"
            required
            placeholder="Nombre del cliente"
            className={`${field} flex-1`}
          />
          <Button type="submit">Agregar</Button>
        </form>
      </details>
    </div>
  );
}
