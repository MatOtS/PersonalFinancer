"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteDraftInvoice, issueInvoice, markInvoicePaid } from "@/lib/queries/invoices";
import { todayISO } from "@/lib/format";

export async function markInvoicePaidAction(invoiceId: string) {
  const supabase = await createClient();
  await markInvoicePaid(supabase, invoiceId, todayISO());
  revalidatePath("/freelance");
  revalidatePath("/home");
}

export async function issueInvoiceAction(invoiceId: string) {
  const supabase = await createClient();
  await issueInvoice(supabase, invoiceId);
  revalidatePath("/freelance");
}

export async function deleteDraftInvoiceAction(invoiceId: string) {
  const supabase = await createClient();
  await deleteDraftInvoice(supabase, invoiceId);
  revalidatePath("/freelance");
}
