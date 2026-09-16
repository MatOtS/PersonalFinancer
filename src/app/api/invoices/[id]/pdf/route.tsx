import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getInvoice, getInvoiceLines, getUserSettings } from "@/lib/queries/invoices";
import { InvoiceDocument, type InvoicePdfData } from "@/lib/pdf/invoice-document";

/** react-pdf embeds raster images only; an SVG logo is skipped rather than broken. */
const RASTER = /\.(png|jpe?g)$/i;

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/invoices/[id]/pdf">) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  // Every read below goes through RLS with the caller's session, so an invoice
  // belonging to someone else simply is not found.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const [invoice, lines, settings] = await Promise.all([
    getInvoice(supabase, id),
    getInvoiceLines(supabase, id),
    getUserSettings(supabase),
  ]);

  if (invoice.status === "draft") {
    return new Response("La factura es un borrador: emitila para generar el PDF.", {
      status: 409,
    });
  }

  const client = one(invoice.client);
  if (!client) return new Response("La factura no tiene cliente", { status: 409 });

  let logo: string | undefined;
  if (settings.logo_path && RASTER.test(settings.logo_path)) {
    const { data: file } = await supabase.storage.from("branding").download(settings.logo_path);
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      logo = `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
    }
  }

  const data: InvoicePdfData = {
    invoiceNumber: invoice.invoice_number ?? "",
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    irpfPct: invoice.irpf_pct,
    ivaPct: invoice.iva_pct,
    paymentMethod: settings.payment_method,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
    })),
    issuer: {
      name: settings.issuer_name,
      taxId: settings.issuer_tax_id,
      address: settings.issuer_address,
      email: settings.issuer_email,
      phone: settings.issuer_phone,
      iban: settings.issuer_iban,
    },
    client: {
      name: client.name,
      taxId: client.tax_id,
      address: client.address,
      email: client.email,
    },
    logo,
  };

  const pdf = await renderToBuffer(<InvoiceDocument data={data} />);
  const filename = `factura-${(invoice.invoice_number ?? id).replace(/[^\w-]/g, "-")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // The document carries the user's fiscal data: never cached by a proxy.
      "Cache-Control": "private, no-store",
    },
  });
}
