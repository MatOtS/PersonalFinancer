import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export async function getInvoices(supabase: Client) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, issue_date, due_date, amount, irpf_pct, iva_pct, net_amount, status, client:clients(id, name)"
    )
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClients(supabase: Client) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, tax_id, address, email")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getUserSettings(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data;
}

export function nextInvoiceNumber(format: string, next: number) {
  const year = new Date().getFullYear();
  const padded = String(next).padStart(3, "0");
  return format.replace("YYYY", String(year)).replace("NNN", padded);
}

/** Base imponible: the lines before IRPF and IVA. */
export function lineTotal(line: InvoiceLineInput) {
  return line.quantity * line.unit_price;
}

export function invoiceTotals(lines: InvoiceLineInput[], irpfPct: number, ivaPct: number) {
  const base = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const iva = (base * ivaPct) / 100;
  const irpf = (base * irpfPct) / 100;
  return { base, iva, irpf, total: base + iva - irpf };
}

/** Issue date + the configured payment window, as an ISO date. */
export function dueDateFrom(issueDate: string, days: number) {
  const date = new Date(`${issueDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Creates the invoice as a draft: no number is assigned yet, because a draft
 * that is later discarded would otherwise leave a hole in a series that has to
 * be correlative.
 */
export async function createDraftInvoice(
  supabase: Client,
  input: {
    client_id: string;
    issue_date: string;
    due_date: string | null;
    irpf_pct: number;
    iva_pct: number;
    lines: InvoiceLineInput[];
  }
) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: input.client_id,
      issue_date: input.issue_date,
      due_date: input.due_date,
      irpf_pct: input.irpf_pct,
      iva_pct: input.iva_pct,
      // The line trigger overwrites both as soon as the lines land.
      amount: 0,
      net_amount: 0,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;

  await replaceInvoiceLines(supabase, invoice.id, input.lines);
  return invoice;
}

export async function getInvoice(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, issue_date, due_date, amount, irpf_pct, iva_pct, net_amount, status, paid_date, client:clients(id, name, tax_id, address, email)"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getInvoiceLines(supabase: Client, invoiceId: string) {
  const { data, error } = await supabase
    .from("invoice_lines")
    .select("id, position, description, quantity, unit_price")
    .eq("invoice_id", invoiceId)
    .order("position");
  if (error) throw error;
  return data;
}

/**
 * Lines are rewritten wholesale rather than diffed: an invoice has a handful of
 * them and the totals trigger recomputes from scratch either way.
 */
export async function replaceInvoiceLines(
  supabase: Client,
  invoiceId: string,
  lines: InvoiceLineInput[]
) {
  const { error: deleteError } = await supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", invoiceId);
  if (deleteError) throw deleteError;

  const rows = lines
    .filter((l) => l.description.trim() !== "")
    .map((l, index) => ({
      invoice_id: invoiceId,
      position: index,
      description: l.description.trim(),
      quantity: l.quantity,
      unit_price: l.unit_price,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("invoice_lines").insert(rows);
  if (error) throw error;
}

export async function updateDraftInvoice(
  supabase: Client,
  id: string,
  input: {
    client_id: string;
    issue_date: string;
    due_date: string | null;
    irpf_pct: number;
    iva_pct: number;
    lines: InvoiceLineInput[];
  }
) {
  const { error } = await supabase
    .from("invoices")
    .update({
      client_id: input.client_id,
      issue_date: input.issue_date,
      due_date: input.due_date,
      irpf_pct: input.irpf_pct,
      iva_pct: input.iva_pct,
    })
    .eq("id", id);
  if (error) throw error;

  await replaceInvoiceLines(supabase, id, input.lines);
}

/**
 * Assigns the correlative number and moves the invoice to `issued`. The number
 * is taken at this moment, not at creation, so the series has no gaps.
 */
export async function issueInvoice(supabase: Client, id: string) {
  const settings = await getUserSettings(supabase);
  const invoice_number = nextInvoiceNumber(
    settings.invoice_number_format,
    settings.invoice_number_next
  );

  const { error } = await supabase
    .from("invoices")
    .update({ status: "issued", invoice_number })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw error;

  await supabase
    .from("user_settings")
    .update({ invoice_number_next: settings.invoice_number_next + 1 })
    .eq("user_id", settings.user_id);

  return invoice_number;
}

export async function markInvoicePaid(supabase: Client, id: string, paidDate: string) {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_date: paidDate })
    .eq("id", id);
  if (error) throw error;
}

/** Only drafts can be deleted — an issued number has to stay in the series. */
export async function deleteDraftInvoice(supabase: Client, id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "draft");
  if (error) throw error;
}
