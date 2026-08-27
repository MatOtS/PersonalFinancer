"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FixedExpenseFrequency } from "@/lib/supabase/types";

export async function updateSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .update({
      default_irpf_pct: Number(formData.get("default_irpf_pct")),
      default_iva_pct: Number(formData.get("default_iva_pct")),
      invoice_number_format: String(formData.get("invoice_number_format")),
      invoice_number_next: Number(formData.get("invoice_number_next")),
    })
    .eq("user_id", user.id);

  revalidatePath("/settings");
}

export async function addAccountAction(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  if (!name) return;
  await supabase.from("accounts").insert({ name });
  revalidatePath("/settings");
}

export async function addCategoryAction(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  if (!name) return;
  await supabase.from("categories").insert({ name });
  revalidatePath("/settings");
}

export async function addSubcategoryAction(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  const category_id = String(formData.get("category_id"));
  if (!name || !category_id) return;
  await supabase.from("subcategories").insert({ name, category_id });
  revalidatePath("/settings");
}

export async function addFixedExpenseAction(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name")).trim();
  const amount = Number(formData.get("amount"));
  const frequency = String(formData.get("frequency")) as FixedExpenseFrequency;
  const account_id = String(formData.get("account_id")) || null;
  const category_id = String(formData.get("category_id")) || null;
  if (!name || !amount) return;

  await supabase.from("fixed_expenses").insert({
    name,
    amount,
    frequency,
    account_id,
    category_id,
  });
  revalidatePath("/settings");
  revalidatePath("/home");
}

export async function addCategoryKeywordAction(formData: FormData) {
  const supabase = await createClient();
  const keyword = String(formData.get("keyword")).trim();
  const category_id = String(formData.get("category_id"));
  if (!keyword || !category_id) return;
  await supabase.from("category_keywords").insert({ keyword, category_id });
  revalidatePath("/settings");
}
