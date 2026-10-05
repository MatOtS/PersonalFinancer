"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDraftInvoice, issueInvoice, type InvoiceLineInput } from "@/lib/queries/invoices";

/** The line inputs share a name, so each column arrives as a parallel array. */
function readLines(formData: FormData): InvoiceLineInput[] {
  const descriptions = formData.getAll("line_description").map(String);
  const quantities = formData.getAll("line_quantity").map(String);
  const prices = formData.getAll("line_unit_price").map(String);

  return descriptions
    .map((description, index) => ({
      description: description.trim(),
      quantity: Number(quantities[index]) || 0,
      unit_price: Number(prices[index]) || 0,
    }))
    .filter((line) => line.description !== "");
}

export async function createInvoiceAction(formData: FormData) {
  const supabase = await createClient();
  const lines = readLines(formData);
  if (lines.length === 0) return;

  const dueDate = String(formData.get("due_date") ?? "").trim();

  const invoice = await createDraftInvoice(supabase, {
    client_id: String(formData.get("client_id")),
    issue_date: String(formData.get("issue_date")),
    due_date: dueDate === "" ? null : dueDate,
    irpf_pct: Number(formData.get("irpf_pct")) || 0,
    iva_pct: Number(formData.get("iva_pct")) || 0,
    lines,
  });

  if (formData.get("intent") === "issue") {
    await issueInvoice(supabase, invoice.id);
  }

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
