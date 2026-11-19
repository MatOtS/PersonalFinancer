import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ValidFixedExpense } from "@/domain/fixed-expenses";
import { compareNames } from "@/domain/names";
import { ACCOUNT_GONE } from "./accounts";
import { CATEGORY_GONE } from "./categories";

type Client = SupabaseClient<Database>;

export type FixedExpense = {
  id: string;
  name: string;
  amountCents: number;
  frequency: string;
};
export type FixedExpenseResult = { ok: true } | { ok: false; error: string };

// Same layout as accounts.ts: the function with the client holds the logic and
// is what the tests call; the plain one creates the real client.

// Only the active ones: they are what the dashboard shows.
export async function listFixedExpensesWithClient(
  supabase: Client,
): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from("fixed_expenses")
    .select("id, name, amount_cents, frequency")
    .eq("active", true);
  if (error) {
    throw new Error(`Could not load the fixed expenses, error: ${error}`);
  }
  return data
    .map((row) => ({
      id: row.id,
      name: row.name,
      amountCents: row.amount_cents,
      frequency: row.frequency,
    }))
    .sort((a, b) => compareNames(a.name, b.name));
}

export async function createFixedExpenseWithClient(
  supabase: Client,
  input: ValidFixedExpense,
): Promise<FixedExpenseResult> {
  const { error } = await supabase.from("fixed_expenses").insert({
    name: input.name,
    amount_cents: input.amountCents,
    frequency: input.frequency,
    account_id: input.accountId,
    category_id: input.categoryId,
  });
  // The account or the category was deleted after the form was opened.
  if (error?.code === "23503") {
    const gone = error.message.includes("fixed_expenses_account_fkey")
      ? ACCOUNT_GONE
      : error.message.includes("fixed_expenses_category_fkey")
        ? CATEGORY_GONE
        : null;
    if (gone) return { ok: false, error: gone };
  }
  if (error) {
    throw new Error(`Could not save the fixed expense, error: ${error}`);
  }
  return { ok: true };
}

export async function listFixedExpenses(): Promise<FixedExpense[]> {
  return listFixedExpensesWithClient(await createClient());
}

export async function createFixedExpense(
  input: ValidFixedExpense,
): Promise<FixedExpenseResult> {
  return createFixedExpenseWithClient(await createClient(), input);
}
