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
import {
  countSubcategories,
  createCategory,
  createSubcategory,
  deleteCategory,
  DUPLICATE_CATEGORY,
  DUPLICATE_SUBCATEGORY,
  renameCategory,
  type CategoryRef,
  type Kind,
} from "@/data/categories";
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

export type CategoryFormState = {
  // What the user typed, so a failed attempt keeps it.
  name: string;
  errors: { name?: string };
  // For problems that belong to no field, like "the category no longer exists".
  message: string | null;
  saved: boolean;
};

export type DeleteCategoryState = { message: string | null };

// A taken name belongs to the name field; anything else (the category is gone)
// is a message for the whole form.
function categoryFailed(name: string, error: string): CategoryFormState {
  const isDuplicate =
    error === DUPLICATE_CATEGORY || error === DUPLICATE_SUBCATEGORY;
  return {
    name,
    errors: isDuplicate ? { name: error } : {},
    message: isDuplicate ? null : error,
    saved: false,
  };
}

const categorySaved: CategoryFormState = {
  name: "",
  errors: {},
  message: null,
  saved: true,
};

// The forms send `parentId` empty for a category. RLS makes a made-up value
// harmless: it only changes the wording of a message.
const readRef = (formData: FormData): CategoryRef => ({
  id: text(formData.get("id")),
  parentId: text(formData.get("parentId")) || null,
});

function readKind(formData: FormData): Kind {
  const kind = text(formData.get("kind"));
  if (kind !== "expense" && kind !== "income") {
    throw new Error(`Invalid category kind: ${kind}`);
  }
  return kind;
}

export async function addCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const kind = readKind(formData);
  const name = text(formData.get("name"));
  const nameError = validateName(name);
  if (nameError) {
    return { name, errors: { name: nameError }, message: null, saved: false };
  }

  const result = await createCategory({ kind, name });
  if (!result.ok) return categoryFailed(name, result.error);

  revalidatePath(SETTINGS_PATH);
  return categorySaved;
}

export async function addSubcategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parentId = text(formData.get("parentId"));
  const name = text(formData.get("name"));
  const nameError = validateName(name);
  if (nameError) {
    return { name, errors: { name: nameError }, message: null, saved: false };
  }

  const result = await createSubcategory(parentId, name);

  // Also when the category is gone: the list must stop showing it.
  revalidatePath(SETTINGS_PATH);
  return result.ok ? categorySaved : categoryFailed(name, result.error);
}

export async function renameCategoryAction(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = text(formData.get("name"));
  const nameError = validateName(name);
  if (nameError) {
    return { name, errors: { name: nameError }, message: null, saved: false };
  }

  const result = await renameCategory(readRef(formData), name);

  revalidatePath(SETTINGS_PATH);
  return result.ok
    ? { name, errors: {}, message: null, saved: true }
    : categoryFailed(name, result.error);
}

export async function deleteCategoryAction(
  _previousState: DeleteCategoryState,
  formData: FormData,
): Promise<DeleteCategoryState> {
  const result = await deleteCategory(readRef(formData));

  // Also when it was already gone: the list must stop showing it.
  revalidatePath(SETTINGS_PATH);
  return { message: result.ok ? null : result.error };
}

// Asked when the user presses "Eliminar" on a category, so the confirmation
// shows the number as it is now and not as it was when the page was loaded.
export async function countSubcategoriesAction(
  categoryId: string,
): Promise<number> {
  return countSubcategories(categoryId);
}
