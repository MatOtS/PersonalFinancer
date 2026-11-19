"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDraft,
  deleteDraft,
  issueInvoice,
  payInvoice,
  updateDraft,
} from "@/data/invoices";
import {
  validateInvoice,
  type InvoiceErrors,
  type InvoiceInput,
  type LineInput,
} from "@/domain/invoices";
import { todayInMadrid } from "@/domain/movements";

const INVOICES_PATH = "/freelance";

export type InvoiceFormState = {
  // What the user typed, so a failed attempt keeps it.
  values: InvoiceInput;
  errors: InvoiceErrors;
  message: string | null;
};

export type InvoiceActionState = { message: string | null };

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

// The lines travel as one text (JSON) because their number changes.
function readLines(raw: string): LineInput[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>) => ({
      description: String(item?.description ?? ""),
      quantity: String(item?.quantity ?? ""),
      unitPrice: String(item?.unitPrice ?? ""),
    }));
  } catch {
    return [];
  }
}

const readForm = (formData: FormData): InvoiceInput => ({
  clientId: text(formData.get("clientId")),
  issueDate: text(formData.get("issueDate")),
  dueDate: text(formData.get("dueDate")),
  irpf: text(formData.get("irpf")),
  iva: text(formData.get("iva")),
  lines: readLines(text(formData.get("lines"))),
});

// Creates the draft, or changes it when the form carries an `id`. Both send
// the user back to the list of invoices.
export async function saveInvoiceAction(
  _previousState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const values = readForm(formData);
  const check = validateInvoice(values, todayInMadrid());
  if ("errors" in check) return { values, errors: check.errors, message: null };

  const id = text(formData.get("id"));
  const result = id
    ? await updateDraft(id, check.invoice)
    : await createDraft(check.invoice);
  if (!result.ok) return { values, errors: {}, message: result.error };

  revalidatePath(INVOICES_PATH);
  redirect(INVOICES_PATH);
}

export async function issueInvoiceAction(
  _previousState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const year = Number(todayInMadrid().slice(0, 4));
  const result = await issueInvoice(text(formData.get("id")), year);
  revalidatePath(INVOICES_PATH);
  return { message: result.ok ? null : result.error };
}

export async function deleteDraftAction(
  _previousState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const result = await deleteDraft(text(formData.get("id")));
  revalidatePath(INVOICES_PATH);
  return { message: result.ok ? null : result.error };
}

export async function payInvoiceAction(
  _previousState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const date = text(formData.get("paidDate")) || todayInMadrid();
  const result = await payInvoice(text(formData.get("id")), date);
  revalidatePath(INVOICES_PATH);
  revalidatePath("/");
  return { message: result.ok ? null : result.error };
}
