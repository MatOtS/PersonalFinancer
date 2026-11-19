import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { listClients } from "@/data/clients";
import { getInvoice, getSettings } from "@/data/invoices";
import { todayInMadrid } from "@/domain/movements";

// Only a draft can be edited: an issued invoice keeps its content.
export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, clients, settings] = await Promise.all([
    getInvoice(id),
    listClients(),
    getSettings(),
  ]);
  if (!invoice) notFound();
  if (invoice.status !== "draft") redirect("/freelance");

  return (
    <>
      <h1 className="text-h1 font-bold">Editar factura</h1>
      <InvoiceForm
        clients={clients}
        today={todayInMadrid()}
        defaults={settings.billing}
        invoice={invoice}
      />
    </>
  );
}
