import { createClient } from "@/lib/supabase/server";
import { getClients, getUserSettings, nextInvoiceNumber } from "@/lib/queries/invoices";
import { InvoiceForm } from "./invoice-form";
import { createClientAction } from "./actions";

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

      <details className="max-w-md rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm font-medium">Agregar cliente nuevo</summary>
        <form action={createClientAction} className="mt-3 flex gap-2">
          <input
            name="name"
            required
            placeholder="Nombre del cliente"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Agregar
          </button>
        </form>
      </details>
    </div>
  );
}
