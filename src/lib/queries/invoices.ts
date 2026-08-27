import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export async function getInvoices(supabase: Client) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, issue_date, amount, irpf_pct, iva_pct, net_amount, issued, paid, paid_date, client:clients(id, name)"
    )
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClients(supabase: Client) {
  const { data, error } = await supabase.from("clients").select("id, name").order("name");
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

export async function createInvoice(
  supabase: Client,
  input: {
    client_id: string;
    issue_date: string;
    amount: number;
    irpf_pct: number;
    iva_pct: number;
  }
) {
  const settings = await getUserSettings(supabase);
  const invoice_number = nextInvoiceNumber(settings.invoice_number_format, settings.invoice_number_next);
  const net_amount = input.amount - (input.amount * input.irpf_pct) / 100 + (input.amount * input.iva_pct) / 100;

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...input, invoice_number, net_amount })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("user_settings")
    .update({ invoice_number_next: settings.invoice_number_next + 1 })
    .eq("user_id", settings.user_id);

  return data;
}

export async function markInvoicePaid(supabase: Client, id: string, paidDate: string) {
  const { error } = await supabase.from("invoices").update({ paid: true, paid_date: paidDate }).eq("id", id);
  if (error) throw error;
}
