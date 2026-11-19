import { describe, expect, it } from "vitest";
import {
  frequencyLabel,
  validateFixedExpense,
  type FixedExpenseInput,
} from "./fixed-expenses";

const VALID: FixedExpenseInput = {
  name: "  Alquiler ",
  amount: "800",
  frequency: "monthly",
  accountId: "",
  categoryId: "",
};

describe("A fixed expense", () => {
  it("needs a name and an amount, and cleans what it keeps", () => {
    expect(validateFixedExpense(VALID)).toEqual({
      value: {
        name: "Alquiler",
        amountCents: 80000,
        frequency: "monthly",
        accountId: null,
        categoryId: null,
      },
    });
  });

  it("reports an empty name and an empty amount, each in its own field", () => {
    expect(validateFixedExpense({ ...VALID, name: " ", amount: "" })).toEqual({
      errors: {
        name: "Introduce un nombre",
        amount: "El importe no puede estar vacío",
      },
    });
  });

  it("refuses a negative amount and a frequency that does not exist", () => {
    expect(
      validateFixedExpense({ ...VALID, amount: "-5", frequency: "weekly" }),
    ).toEqual({
      errors: {
        amount: "Introduce un importe válido",
        frequency: "Elige una frecuencia",
      },
    });
  });

  it("keeps the account and the category when they are chosen", () => {
    expect(
      validateFixedExpense({ ...VALID, accountId: "a1", categoryId: "c1" }),
    ).toMatchObject({ value: { accountId: "a1", categoryId: "c1" } });
  });
});

describe("The frequency is shown in Spanish", () => {
  it.each([
    ["monthly", "Mensual"],
    ["bimonthly", "Bimestral"],
    ["quarterly", "Trimestral"],
    ["annual", "Anual"],
  ])("%s is %s", (value, label) => {
    expect(frequencyLabel(value)).toBe(label);
  });
});
