"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/lib/queries/invoices";

export async function createInvoiceAction(formData: FormData) {
  const supabase = await createClient();

  await createInvoice(supabase, {
    client_id: String(formData.get("client_id")),
    issue_date: String(formData.get("issue_date")),
    amount: Number(formData.get("amount")),
    irpf_pct: Number(formData.get("irpf_pct")),
    iva_pct: Number(formData.get("iva_pct")),
  });

  revalidatePath("/freelance");
  redirect("/freelance");
}

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  if (!name) return;

  await supabase.from("clients").insert({ name });
  revalidatePath("/invoices/new");
}
