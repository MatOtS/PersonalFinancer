import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { cleanName, compareNames, nameKey } from "@/domain/names";

type Client = SupabaseClient<Database>;

export type Account = {
  id: string;
  name: string;
  openingBalanceCents: number;
};
export type AccountInput = { name: string; openingBalanceCents: number };
export type AccountResult = { ok: true } | { ok: false; error: string };

export const DUPLICATE_ACCOUNT = "Ya tienes una cuenta con ese nombre";
export const ACCOUNT_GONE = "Esta cuenta ya no existe";

// Each operation has two functions, like `signIn` in auth.ts: the one with the
// client holds the logic and is what the tests call; the plain one creates the
// real client and is what the app calls.

export async function listAccountsWithClient(
  supabase: Client,
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, opening_balance_cents");
  if (error) throw new Error(`Could not load the accounts, error: ${error}`);
  return data
    .map((row) => ({
      id: row.id,
      name: row.name,
      openingBalanceCents: row.opening_balance_cents,
    }))
    .sort((a, b) => compareNames(a.name, b.name));
}

export async function createAccountWithClient(
  supabase: Client,
  input: AccountInput,
): Promise<AccountResult> {
  const { error } = await supabase.from("accounts").insert({
    name: cleanName(input.name),
    name_key: nameKey(input.name),
    opening_balance_cents: input.openingBalanceCents,
  });
  if (error?.code === "23505") {
    return { ok: false, error: DUPLICATE_ACCOUNT };
  }
  if (error) throw new Error(`Could not save the account, error: ${error}`);
  return { ok: true };
}

export async function renameAccountWithClient(
  supabase: Client,
  id: string,
  name: string,
): Promise<AccountResult> {
  const { data, error } = await supabase
    .from("accounts")
    .update({ name: cleanName(name), name_key: nameKey(name) })
    .eq("id", id)
    .select("id");
  if (error?.code === "23505") {
    return { ok: false, error: DUPLICATE_ACCOUNT };
  }
  if (error) throw new Error(`Could not rename the account, error: ${error}`);
  if (data.length === 0) return { ok: false, error: ACCOUNT_GONE };
  return { ok: true };
}

export async function setOpeningBalanceWithClient(
  supabase: Client,
  id: string,
  openingBalanceCents: number,
): Promise<AccountResult> {
  const { data, error } = await supabase
    .from("accounts")
    .update({ opening_balance_cents: openingBalanceCents })
    .eq("id", id)
    .select("id");
  if (error)
    throw new Error(`Could not update opening balance, error: ${error}`);
  if (data.length === 0) return { ok: false, error: ACCOUNT_GONE };
  return { ok: true };
}

export async function deleteAccountWithClient(
  supabase: Client,
  id: string,
): Promise<AccountResult> {
  const { data, error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Could not delete the account, error: ${error}`);
  if (data.length === 0) return { ok: false, error: ACCOUNT_GONE };
  return { ok: true };
}

export async function listAccounts(): Promise<Account[]> {
  return listAccountsWithClient(await createClient());
}

export async function createAccount(
  input: AccountInput,
): Promise<AccountResult> {
  return createAccountWithClient(await createClient(), input);
}

export async function renameAccount(
  id: string,
  name: string,
): Promise<AccountResult> {
  return renameAccountWithClient(await createClient(), id, name);
}

export async function setOpeningBalance(
  id: string,
  openingBalanceCents: number,
): Promise<AccountResult> {
  return setOpeningBalanceWithClient(
    await createClient(),
    id,
    openingBalanceCents,
  );
}

export async function deleteAccount(id: string): Promise<AccountResult> {
  return deleteAccountWithClient(await createClient(), id);
}
