import { renderToBuffer } from "@react-pdf/renderer";
import { getInvoice, getSettings } from "@/data/invoices";
import { getLogo } from "@/data/logo";
import { getSignedInUser } from "@/data/auth";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";

// The PDF of an issued or paid invoice, made on the server and never stored.
// Every read goes through the policies with the session of the caller, so an
// invoice of another user is simply not found.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) return new Response("Factura no encontrada", { status: 404 });
  if (invoice.status === "draft") {
    return new Response(
      "La factura es un borrador: emítela primero para generar el PDF.",
      { status: 409 },
    );
  }

  const [settings, logo] = await Promise.all([getSettings(), getLogo()]);
  const pdf = await renderToBuffer(
    <InvoiceDocument
      data={{
        invoiceNumber: invoice.number ?? "",
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        irpfBp: invoice.irpfBp,
        ivaBp: invoice.ivaBp,
        lines: invoice.lines,
        issuer: settings.issuer,
        client: invoice.client,
        logo: logo ?? undefined,
      }}
    />,
  );

  const filename = `factura-${(invoice.number ?? id).replace(/[^\w-]/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // It carries the user's fiscal data: never cached by a proxy.
      "Cache-Control": "private, no-store",
    },
  });
}
