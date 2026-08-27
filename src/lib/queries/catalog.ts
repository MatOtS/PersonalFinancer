import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export async function getAccounts(supabase: Client) {
  const { data, error } = await supabase.from("accounts").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function getCategoriesWithSubcategories(supabase: Client) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, subcategories(id, name)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getCategoryKeywords(supabase: Client) {
  const { data, error } = await supabase
    .from("category_keywords")
    .select("keyword, category_id, subcategory_id");
  if (error) throw error;
  return data;
}

export async function createMovement(
  supabase: Client,
  input: {
    date: string;
    description: string;
    account_id: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    amount: number;
    type: "personal" | "freelance";
    is_fixed_expense?: boolean;
    client_id?: string | null;
    source?: "manual" | "csv_import";
  }
) {
  const { error } = await supabase.from("movements").insert(input);
  if (error) throw error;
}
