// Rules for a fixed expense (work item 006): an expense that repeats. The form
// and the server both use them. Money is integer cents (ADR-06).
import { parseMovementAmount } from "./movements";
import { cleanName, validateName } from "./names";

export type Frequency = "monthly" | "bimonthly" | "quarterly" | "annual";

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Mensual" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
];

export const MISSING_FREQUENCY = "Elige una frecuencia";

export const frequencyLabel = (frequency: string): string =>
  FREQUENCIES.find((item) => item.value === frequency)?.label ?? frequency;

// What the form sends, all as text.
export type FixedExpenseInput = {
  name: string;
  amount: string;
  frequency: string;
  accountId: string;
  categoryId: string;
};

export type FixedExpenseErrors = {
  name?: string;
  amount?: string;
  frequency?: string;
};

export type ValidFixedExpense = {
  name: string;
  amountCents: number;
  frequency: Frequency;
  accountId: string | null;
  categoryId: string | null;
};

export type FixedExpenseCheck =
  { errors: FixedExpenseErrors } | { value: ValidFixedExpense };

const isFrequency = (value: string): value is Frequency =>
  FREQUENCIES.some((item) => item.value === value);

// Checks the whole fixed expense and reports every wrong field at once. The
// account and the category are optional.
export function validateFixedExpense(
  input: FixedExpenseInput,
): FixedExpenseCheck {
  const errors: FixedExpenseErrors = {};

  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  const amount = parseMovementAmount(input.amount);
  if ("error" in amount) errors.amount = amount.error;
  if (!isFrequency(input.frequency)) errors.frequency = MISSING_FREQUENCY;

  if (nameError || "error" in amount || !isFrequency(input.frequency)) {
    return { errors };
  }
  return {
    value: {
      name: cleanName(input.name),
      amountCents: amount.cents,
      frequency: input.frequency,
      accountId: input.accountId.trim() || null,
      categoryId: input.categoryId.trim() || null,
    },
  };
}
