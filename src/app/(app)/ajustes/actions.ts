"use server";

import { revalidatePath } from "next/cache";
import {
  createAccount,
  deleteAccount,
  DUPLICATE_ACCOUNT,
  renameAccount,
  setOpeningBalance,
  type AccountResult,
} from "@/data/accounts";
import { parseAmount } from "@/domain/money";
import { validateName } from "@/domain/names";

const SETTINGS_PATH = "/ajustes";

export type AccountFormState = {
  // What the user typed, so a failed attempt keeps it.
  name: string;
  openingBalance: string;
  errors: { name?: string; openingBalance?: string };
  // For problems that belong to no field, like "the account no longer exists".
  message: string | null;
  saved: boolean;
};

export type DeleteAccountState = { message: string | null };

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

// Checks both fields the way the form does; the server repeats it because the
// browser can be skipped. The amount is only converted when it is valid.
function readAccountForm(formData: FormData) {
  const name = text(formData.get("name"));
  const openingBalance = text(formData.get("openingBalance"));
  const nameError = validateName(name);
  const amount = parseAmount(openingBalance);
  const errors: AccountFormState["errors"] = {};
  if (nameError) errors.name = nameError;
  if ("error" in amount) errors.openingBalance = amount.error;
  return {
    name,
    openingBalance,
    errors,
    cents: "cents" in amount ? amount.cents : 0,
  };
}

// A taken name belongs to the name field; anything else (the account is gone)
// is a message for the whole form.
function failed(
  base: Pick<AccountFormState, "name" | "openingBalance">,
  error: string,
): AccountFormState {
  const isDuplicate = error === DUPLICATE_ACCOUNT;
  return {
    ...base,
    errors: isDuplicate ? { name: error } : {},
    message: isDuplicate ? null : error,
    saved: false,
  };
}

export async function addAccountAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { name, openingBalance, errors, cents } = readAccountForm(formData);
  const typed = { name, openingBalance };
  if (errors.name || errors.openingBalance) {
    return { ...typed, errors, message: null, saved: false };
  }

  const result = await createAccount({ name, openingBalanceCents: cents });
  if (!result.ok) return failed(typed, result.error);

  revalidatePath(SETTINGS_PATH);
  return {
    name: "",
    openingBalance: "",
    errors: {},
    message: null,
    saved: true,
  };
}

export async function updateAccountAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const id = text(formData.get("id"));
  const { name, openingBalance, errors, cents } = readAccountForm(formData);
  const typed = { name, openingBalance };
  if (errors.name || errors.openingBalance) {
    return { ...typed, errors, message: null, saved: false };
  }

  let result: AccountResult;
  try {
    result = await renameAccount(id, name);
    if (result.ok) result = await setOpeningBalance(id, cents);
  } finally {
    // Always refreshed: when the account is gone it disappears from the list,
    // and when the second call throws the new name is already saved.
    revalidatePath(SETTINGS_PATH);
  }
  if (!result.ok) return failed(typed, result.error);
  return { ...typed, errors: {}, message: null, saved: true };
}

export async function deleteAccountAction(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const result = await deleteAccount(text(formData.get("id")));

  // Also when it was already gone: the list must stop showing it.
  revalidatePath(SETTINGS_PATH);
  return { message: result.ok ? null : result.error };
}
