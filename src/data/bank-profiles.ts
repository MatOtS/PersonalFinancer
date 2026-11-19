import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { Mapping } from "@/domain/statement/columns";

type Client = SupabaseClient<Database>;

// The columns the user left for each account, by the id of the account.
export type BankProfiles = Record<string, Mapping>;

export async function listBankProfilesWithClient(
  supabase: Client,
): Promise<BankProfiles> {
  const { data, error } = await supabase
    .from("bank_profiles")
    .select(
      "account_id, date_column, description_column, amount_column, sign_column",
    );
  if (error) throw new Error(`Could not load the columns, error: ${error}`);
  return Object.fromEntries(
    data.map((row) => [
      row.account_id,
      {
        date: row.date_column,
        description: row.description_column,
        amount: row.amount_column,
        sign: row.sign_column ?? "",
      },
    ]),
  );
}

// One profile per account: a new one replaces the old.
export async function saveBankProfileWithClient(
  supabase: Client,
  accountId: string,
  mapping: Mapping,
): Promise<void> {
  const { error } = await supabase.from("bank_profiles").upsert(
    {
      account_id: accountId,
      date_column: mapping.date,
      description_column: mapping.description,
      amount_column: mapping.amount,
      sign_column: mapping.sign === "" ? null : mapping.sign,
    },
    { onConflict: "user_id,account_id" },
  );
  if (error) throw new Error(`Could not save the columns, error: ${error}`);
}

export async function listBankProfiles(): Promise<BankProfiles> {
  return listBankProfilesWithClient(await createClient());
}

export async function saveBankProfile(
  accountId: string,
  mapping: Mapping,
): Promise<void> {
  return saveBankProfileWithClient(await createClient(), accountId, mapping);
}
