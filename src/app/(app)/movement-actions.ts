"use server";

import { listAccounts, ACCOUNT_GONE, type Account } from "@/data/accounts";
import {
  CATEGORY_GONE,
  listCategories,
  SUBCATEGORY_GONE,
  type CategoryGroups,
} from "@/data/categories";
import { createMovement } from "@/data/movements";
import {
  todayInMadrid,
  validateMovement,
  type MovementErrors,
  type MovementInput,
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
export async function createMovementAction(
  _previousState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const values = readForm(formData);
  const check = validateMovement(values, todayInMadrid());
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }

  const result = await createMovement(check.movement);
  if (result.ok) {
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
