import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  invoiceTotals,
  type BillingInput,
  type InvoiceStatus,
  type IssuerInput,
  type ValidBilling,
  type ValidInvoice,
  type ValidIssuer,
  type ValidLine,
} from "@/domain/invoices";

type Client = SupabaseClient<Database>;

export type InvoiceResult = { ok: true } | { ok: false; error: string };

export const INVOICE_NOT_DRAFT = "Esta factura ya no es un borrador";
export const INVOICE_NOT_ISSUED = "Esta factura no está emitida";
export const NUMBER_TAKEN =
  "Ese número de factura ya existe: cambia el siguiente número en Ajustes";
export const NO_ACCOUNTS_TO_PAY =
  "Crea una cuenta antes de marcar la factura como cobrada";
export const CLIENT_GONE_FOR_INVOICE = "Este cliente ya no existe";

// What a new user has before saving anything: the same values as the columns
// of the table.
export const DEFAULT_BILLING: ValidBilling = {
  irpfBp: 1500,
  ivaBp: 2100,
  numberFormat: "YYYY-NNN",
  numberNext: 1,
  dueDays: 30,
};

export type Settings = { issuer: ValidIssuer; billing: ValidBilling };

export type InvoiceSummary = {
  id: string;
  number: string | null;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  netCents: number;
};

export type InvoiceDetail = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  clientId: string;
  client: {
    name: string;
    taxId: string | null;
    address: string | null;
    email: string | null;
  };
  issueDate: string;
  dueDate: string | null;
  irpfBp: number;
  ivaBp: number;
  paidDate: string | null;
  lines: ValidLine[];
};

const asLine = (row: {
  description: string;
  quantity_hundredths: number;
  unit_price_cents: number;
}): ValidLine => ({
  description: row.description,
  quantityHundredths: row.quantity_hundredths,
  unitPriceCents: row.unit_price_cents,
});

const asStatus = (value: string): InvoiceStatus =>
  value === "issued" || value === "paid" ? value : "draft";

// Same layout as accounts.ts: the function with the client holds the logic and
// is what the tests call; the plain one creates the real client.

export async function getSettingsWithClient(
  supabase: Client,
): Promise<Settings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not load the settings, error: ${error}`);
  return {
    issuer: {
      name: data?.issuer_name ?? null,
      taxId: data?.issuer_tax_id ?? null,
      phone: data?.issuer_phone ?? null,
      address: data?.issuer_address ?? null,
      email: data?.issuer_email ?? null,
      iban: data?.issuer_iban ?? null,
    },
    billing: data
      ? {
          irpfBp: data.default_irpf_bp,
          ivaBp: data.default_iva_bp,
          numberFormat: data.invoice_number_format,
          numberNext: data.invoice_number_next,
          dueDays: data.due_days,
        }
      : DEFAULT_BILLING,
  };
}

// The settings are one row per user, created the first time something is
// saved. The owner of the row is filled by the database.
export async function saveIssuerWithClient(
  supabase: Client,
  issuer: ValidIssuer,
): Promise<void> {
  const { error } = await supabase.from("user_settings").upsert(
    {
      issuer_name: issuer.name,
      issuer_tax_id: issuer.taxId,
      issuer_phone: issuer.phone,
      issuer_address: issuer.address,
      issuer_email: issuer.email,
      issuer_iban: issuer.iban,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not save the issuer, error: ${error}`);
}

export async function saveBillingWithClient(
  supabase: Client,
  billing: ValidBilling,
): Promise<void> {
  const { error } = await supabase.from("user_settings").upsert(
    {
      default_irpf_bp: billing.irpfBp,
      default_iva_bp: billing.ivaBp,
      invoice_number_format: billing.numberFormat,
      invoice_number_next: billing.numberNext,
      due_days: billing.dueDays,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not save the billing, error: ${error}`);
}

export async function listInvoicesWithClient(
  supabase: Client,
): Promise<InvoiceSummary[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, issue_date, due_date, irpf_bp, iva_bp, status, clients(name), invoice_lines(description, quantity_hundredths, unit_price_cents)",
    )
    .order("issue_date", { ascending: false });
  if (error) throw new Error(`Could not load the invoices, error: ${error}`);
  return data.map((row) => ({
    id: row.id,
    number: row.invoice_number,
    clientName: row.clients?.name ?? "",
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: asStatus(row.status),
    netCents: invoiceTotals(
      row.invoice_lines.map(asLine),
      row.irpf_bp,
      row.iva_bp,
    ).totalCents,
  }));
}

export async function getInvoiceWithClient(
  supabase: Client,
  id: string,
): Promise<InvoiceDetail | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, client_id, issue_date, due_date, irpf_bp, iva_bp, status, paid_date, clients(name, tax_id, address, email), invoice_lines(description, quantity_hundredths, unit_price_cents, position)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the invoice, error: ${error}`);
  if (!data) return null;
  return {
    id: data.id,
    number: data.invoice_number,
    status: asStatus(data.status),
    clientId: data.client_id,
    client: {
      name: data.clients?.name ?? "",
      taxId: data.clients?.tax_id ?? null,
      address: data.clients?.address ?? null,
      email: data.clients?.email ?? null,
    },
    issueDate: data.issue_date,
    dueDate: data.due_date,
    irpfBp: data.irpf_bp,
    ivaBp: data.iva_bp,
    paidDate: data.paid_date,
    lines: [...data.invoice_lines]
      .sort((a, b) => a.position - b.position)
      .map(asLine),
  };
}

const lineRows = (invoiceId: string, lines: ValidLine[]) =>
  lines.map((line, position) => ({
    invoice_id: invoiceId,
    position,
    description: line.description,
    quantity_hundredths: line.quantityHundredths,
    unit_price_cents: line.unitPriceCents,
  }));

// A draft is made of its header and its lines. If the lines fail the header
// is removed, so no empty draft is left behind.
export async function createDraftWithClient(
  supabase: Client,
  invoice: ValidInvoice,
): Promise<InvoiceResult & { id?: string }> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      client_id: invoice.clientId,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      irpf_bp: invoice.irpfBp,
      iva_bp: invoice.ivaBp,
    })
    .select("id")
    .single();
  if (error?.code === "23503") {
    return { ok: false, error: CLIENT_GONE_FOR_INVOICE };
  }
  if (error) throw new Error(`Could not save the invoice, error: ${error}`);

  const lines = await supabase
    .from("invoice_lines")
    .insert(lineRows(data.id, invoice.lines));
  if (lines.error) {
    await supabase.from("invoices").delete().eq("id", data.id);
    throw new Error(`Could not save the lines, error: ${lines.error}`);
  }
  return { ok: true, id: data.id };
}

export async function updateDraftWithClient(
  supabase: Client,
  id: string,
  invoice: ValidInvoice,
): Promise<InvoiceResult> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      client_id: invoice.clientId,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      irpf_bp: invoice.irpfBp,
      iva_bp: invoice.ivaBp,
    })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error?.code === "23503") {
    return { ok: false, error: CLIENT_GONE_FOR_INVOICE };
  }
  if (error) throw new Error(`Could not update the invoice, error: ${error}`);
  if (data.length === 0) return { ok: false, error: INVOICE_NOT_DRAFT };

  const removed = await supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", id);
  if (removed.error) {
    throw new Error(`Could not replace the lines, error: ${removed.error}`);
  }
  const added = await supabase
    .from("invoice_lines")
    .insert(lineRows(id, invoice.lines));
  if (added.error) {
    throw new Error(`Could not replace the lines, error: ${added.error}`);
  }
  return { ok: true };
}

// Only a draft: an issued number has to stay in the series.
export async function deleteDraftWithClient(
  supabase: Client,
  id: string,
): Promise<InvoiceResult> {
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(`Could not delete the invoice, error: ${error}`);
  if (data.length === 0) return { ok: false, error: INVOICE_NOT_DRAFT };
  return { ok: true };
}

export async function issueInvoiceWithClient(
  supabase: Client,
  id: string,
  year: number,
): Promise<InvoiceResult> {
  const { error } = await supabase.rpc("issue_invoice", {
    p_id: id,
    p_year: year,
  });
  if (error?.code === "P0002") return { ok: false, error: INVOICE_NOT_DRAFT };
  if (error?.code === "23505") return { ok: false, error: NUMBER_TAKEN };
  if (error) throw new Error(`Could not issue the invoice, error: ${error}`);
  return { ok: true };
}

// Marks it as paid and creates the income, in one step in the database. The
// amount is the net total of the lines, computed here (ADR-05).
export async function payInvoiceWithClient(
  supabase: Client,
  id: string,
  paidDate: string,
): Promise<InvoiceResult> {
  const invoice = await getInvoiceWithClient(supabase, id);
  if (!invoice || invoice.status !== "issued") {
    return { ok: false, error: INVOICE_NOT_ISSUED };
  }
  const { totalCents } = invoiceTotals(
    invoice.lines,
    invoice.irpfBp,
    invoice.ivaBp,
  );
  const { error } = await supabase.rpc("pay_invoice", {
    p_id: id,
    p_date: paidDate,
    p_amount_cents: totalCents,
  });
  if (error?.code === "P0002") return { ok: false, error: INVOICE_NOT_ISSUED };
  if (error?.code === "P0003") return { ok: false, error: NO_ACCOUNTS_TO_PAY };
  if (error)
    throw new Error(`Could not mark the invoice as paid, error: ${error}`);
  return { ok: true };
}

export async function getSettings(): Promise<Settings> {
  return getSettingsWithClient(await createClient());
}
export async function saveIssuer(issuer: ValidIssuer): Promise<void> {
  return saveIssuerWithClient(await createClient(), issuer);
}
export async function saveBilling(billing: ValidBilling): Promise<void> {
  return saveBillingWithClient(await createClient(), billing);
}
export async function listInvoices(): Promise<InvoiceSummary[]> {
  return listInvoicesWithClient(await createClient());
}
export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  return getInvoiceWithClient(await createClient(), id);
}
export async function createDraft(invoice: ValidInvoice) {
  return createDraftWithClient(await createClient(), invoice);
}
export async function updateDraft(id: string, invoice: ValidInvoice) {
  return updateDraftWithClient(await createClient(), id, invoice);
}
export async function deleteDraft(id: string) {
  return deleteDraftWithClient(await createClient(), id);
}
export async function issueInvoice(id: string, year: number) {
  return issueInvoiceWithClient(await createClient(), id, year);
}
export async function payInvoice(id: string, paidDate: string) {
  return payInvoiceWithClient(await createClient(), id, paidDate);
}

export type { BillingInput, IssuerInput };
