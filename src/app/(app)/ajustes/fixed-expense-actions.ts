"use server";

import { revalidatePath } from "next/cache";
import { createFixedExpense } from "@/data/fixed-expenses";
import {
  validateFixedExpense,
  type FixedExpenseErrors,
  type FixedExpenseInput,
} from "@/domain/fixed-expenses";

export type FixedExpenseFormState = {
  // What the user typed, so a failed attempt keeps it.
  values: FixedExpenseInput;
  errors: FixedExpenseErrors;
  message: string | null;
  saved: boolean;
};

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

export async function addFixedExpenseAction(
  _previousState: FixedExpenseFormState,
  formData: FormData,
): Promise<FixedExpenseFormState> {
  const values: FixedExpenseInput = {
    name: text(formData.get("name")),
    amount: text(formData.get("amount")),
    frequency: text(formData.get("frequency")),
    accountId: text(formData.get("accountId")),
    categoryId: text(formData.get("categoryId")),
  };
  const check = validateFixedExpense(values);
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }

  const result = await createFixedExpense(check.value);
  if (!result.ok) {
    return { values, errors: {}, message: result.error, saved: false };
  }
  revalidatePath("/ajustes");
  revalidatePath("/");
  return {
    values: { ...values, name: "", amount: "" },
    errors: {},
    message: null,
    saved: true,
  };
}
