import { createClient } from "@/lib/supabase/server";
import { getClients, getUserSettings, nextInvoiceNumber } from "@/lib/queries/invoices";
import { InvoiceForm } from "./invoice-form";
import { createClientAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const [clients, settings] = await Promise.all([getClients(supabase), getUserSettings(supabase)]);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Emitir factura</h2>

      <InvoiceForm
        clients={clients}
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
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          />
          <Button type="submit">Agregar</Button>
        </form>
      </details>
    </div>
  );
}
