"use server";

import { listAccounts, ACCOUNT_GONE, type Account } from "@/data/accounts";
import {
  CATEGORY_GONE,
  listCategories,
  SUBCATEGORY_GONE,
  type CategoryGroups,
} from "@/data/categories";
import { revalidatePath } from "next/cache";
import {
  createMovement,
  deleteMovements,
  patchMovements,
  updateMovement,
  type MovementResult,
} from "@/data/movements";
import { buildPatch, type BulkInput } from "@/domain/bulk-edit";
import {
  todayInMadrid,
  validateMovement,
  type MovementErrors,
  type MovementInput,
  type ValidMovement,
} from "@/domain/movements";

export type MovementFormData = {
  accounts: Account[];
  categories: CategoryGroups;
};

export type MovementFormState = {
  // What the user typed, so a failed attempt keeps it.
  values: MovementInput;
  errors: MovementErrors;
  // For problems that belong to no field, like "the account no longer exists".
  message: string | null;
  saved: boolean;
};

// Asked when the button is pressed, so the form shows the accounts and the
// categories as they are now.
export async function loadMovementFormAction(): Promise<MovementFormData> {
  const [accounts, categories] = await Promise.all([
    listAccounts(),
    listCategories(),
  ]);
  return { accounts, categories };
}

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

function readForm(formData: FormData): MovementInput {
  return {
    kind: text(formData.get("kind")),
    amount: text(formData.get("amount")),
    date: text(formData.get("date")),
    accountId: text(formData.get("accountId")),
    workKind: text(formData.get("workKind")),
    description: text(formData.get("description")),
    categoryId: text(formData.get("categoryId")),
    subcategoryId: text(formData.get("subcategoryId")),
    isFixed: formData.get("isFixed") === "on",
  };
}

// Checks the movement the way the form does (the browser can be skipped) and
// saves it. When something it points at is gone, the answer keeps everything
// typed and clears only that choice, so the user can pick another.
async function submit(
  formData: FormData,
  save: (movement: ValidMovement) => Promise<MovementResult>,
): Promise<MovementFormState> {
  const values = readForm(formData);
  const check = validateMovement(values, todayInMadrid());
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }

  const result = await save(check.movement);
  if (result.ok) {
    // The dashboards show movements: they have to be read again.
    revalidatePath("/");
    revalidatePath("/freelance");
    return { values, errors: {}, message: null, saved: true };
  }

  const cleared = { ...values };
  if (result.error === ACCOUNT_GONE) cleared.accountId = "";
  if (result.error === CATEGORY_GONE) {
    cleared.categoryId = "";
    cleared.subcategoryId = "";
  }
  if (result.error === SUBCATEGORY_GONE) cleared.subcategoryId = "";
  return { values: cleared, errors: {}, message: result.error, saved: false };
}

export async function createMovementAction(
  _previousState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  return submit(formData, createMovement);
}

// The same rules as the quick entry, applied to a movement already saved.
export async function updateMovementAction(
  _previousState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const id = text(formData.get("id"));
  return submit(formData, (movement) => updateMovement(id, movement));
}

// Changes one field in every movement of `ids`. The rules of the change are
// checked here again: the browser can be skipped.
export async function patchMovementsAction(
  ids: string[],
  input: BulkInput,
): Promise<string | null> {
  const built = buildPatch(input);
  if ("error" in built) return built.error;
  const result = await patchMovements(ids, built.patch);
  revalidatePath("/");
  revalidatePath("/freelance");
  return result.ok ? null : result.error;
}

export async function deleteMovementsAction(ids: string[]): Promise<number> {
  const deleted = await deleteMovements(ids);
  revalidatePath("/");
  revalidatePath("/freelance");
  return deleted;
}
