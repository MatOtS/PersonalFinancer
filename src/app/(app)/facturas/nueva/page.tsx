import Link from "next/link";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { buttonClassName } from "@/components/ui/button";
import { listClients } from "@/data/clients";
import { getSettings } from "@/data/invoices";
import { todayInMadrid } from "@/domain/movements";

export default async function NewInvoicePage() {
  const [clients, settings] = await Promise.all([listClients(), getSettings()]);

  return (
    <>
      <h1 className="text-h1 font-bold">Nueva factura</h1>
      {clients.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 shadow-card">
          <p className="text-body text-text-muted">
            Aún no tienes clientes. Añade uno para poder facturarle.
          </p>
          <Link href="/ajustes#clientes" className={buttonClassName("primary")}>
            Añadir cliente
          </Link>
        </div>
      ) : (
        <InvoiceForm
          clients={clients}
          today={todayInMadrid()}
          defaults={settings.billing}
        />
      )}
    </>
  );
}
