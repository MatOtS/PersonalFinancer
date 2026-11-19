import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFixedExpense } from "@/data/fixed-expenses";
import {
  addFixedExpenseAction,
  type FixedExpenseFormState,
} from "./fixed-expense-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/fixed-expenses", () => ({ createFixedExpense: vi.fn() }));

const EMPTY: FixedExpenseFormState = {
  values: {
    name: "",
    amount: "",
    frequency: "",
    accountId: "",
    categoryId: "",
  },
  errors: {},
  message: null,
  saved: false,
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.mocked(createFixedExpense).mockReset());

describe("addFixedExpenseAction", () => {
  it("saves nothing when the name or the amount is empty", async () => {
    const state = await addFixedExpenseAction(
      EMPTY,
      form({ name: "", amount: "", frequency: "monthly" }),
    );
    expect(state.errors.name).toBe("Introduce un nombre");
    expect(state.errors.amount).toBe("El importe no puede estar vacío");
    expect(createFixedExpense).not.toHaveBeenCalled();
  });

  it("saves a valid one and clears what was typed, keeping the choices", async () => {
    vi.mocked(createFixedExpense).mockResolvedValue({ ok: true });
    const state = await addFixedExpenseAction(
      EMPTY,
      form({
        name: "Luz",
        amount: "40",
        frequency: "bimonthly",
        accountId: "a1",
      }),
    );
    expect(createFixedExpense).toHaveBeenCalledWith({
      name: "Luz",
      amountCents: 4000,
      frequency: "bimonthly",
      accountId: "a1",
      categoryId: null,
    });
    expect(state).toMatchObject({
      saved: true,
      values: { name: "", amount: "", frequency: "bimonthly", accountId: "a1" },
    });
  });

  it("shows the message of the database and keeps what was typed", async () => {
    vi.mocked(createFixedExpense).mockResolvedValue({
      ok: false,
      error: "Esta cuenta ya no existe",
    });
    const state = await addFixedExpenseAction(
      EMPTY,
      form({
        name: "Luz",
        amount: "40",
        frequency: "monthly",
        accountId: "a1",
      }),
    );
    expect(state).toMatchObject({
      saved: false,
      message: "Esta cuenta ya no existe",
      values: { name: "Luz" },
    });
  });
});
