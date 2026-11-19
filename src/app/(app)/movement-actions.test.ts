import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAccounts } from "@/data/accounts";
import { ACCOUNT_GONE } from "@/data/accounts";
import {
  CATEGORY_GONE,
  listCategories,
  SUBCATEGORY_GONE,
} from "@/data/categories";
import {
  createMovement,
  deleteMovements,
  patchMovements,
  updateMovement,
} from "@/data/movements";
import {
  createMovementAction,
  deleteMovementsAction,
  loadMovementFormAction,
  patchMovementsAction,
  updateMovementAction,
  type MovementFormState,
} from "./movement-actions";

// The data layer is replaced, so only what the actions do themselves is
// tested: read the form, validate, save and answer.
vi.mock("@/data/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/accounts")>()),
  listAccounts: vi.fn(),
}));
vi.mock("@/data/categories", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/categories")>()),
  listCategories: vi.fn(),
}));
vi.mock("@/data/movements", () => ({
  createMovement: vi.fn(),
  updateMovement: vi.fn(),
  patchMovements: vi.fn(),
  deleteMovements: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ACCOUNT = "a0000000-0000-0000-0000-000000000001";
const CATEGORY = "c0000000-0000-0000-0000-000000000001";
const SUBCATEGORY = "c0000000-0000-0000-0000-000000000002";

const EMPTY: MovementFormState = {
  values: {
    kind: "",
    amount: "",
    date: "2026-11-18",
    accountId: "",
    workKind: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    isFixed: false,
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

const VALID = {
  kind: "expense",
  amount: "12,50",
  date: "2026-11-18",
  accountId: ACCOUNT,
  workKind: "personal",
  description: "  cena anoche ",
  categoryId: CATEGORY,
  subcategoryId: SUBCATEGORY,
  isFixed: "on",
};

beforeEach(() => {
  vi.mocked(createMovement).mockReset();
  vi.mocked(listAccounts).mockReset();
  vi.mocked(listCategories).mockReset();
});

describe("loadMovementFormAction", () => {
  it("gives the accounts and the categories, asked when the button is pressed", async () => {
    const accounts = [{ id: "1", name: "BBVA", openingBalanceCents: 0 }];
    const categories = { expense: [], income: [] };
    vi.mocked(listAccounts).mockResolvedValue(accounts);
    vi.mocked(listCategories).mockResolvedValue(categories);
    expect(await loadMovementFormAction()).toEqual({ accounts, categories });
  });
});

describe("Saving a movement", () => {
  it("saves the cleaned movement, with the amount positive in cents and the type apart", async () => {
    vi.mocked(createMovement).mockResolvedValue({ ok: true });
    const state = await createMovementAction(EMPTY, form(VALID));
    expect(createMovement).toHaveBeenCalledWith({
      kind: "expense",
      amountCents: 1250,
      date: "2026-11-18",
      accountId: ACCOUNT,
      workKind: "personal",
      description: "cena anoche",
      categoryId: CATEGORY,
      subcategoryId: SUBCATEGORY,
      isFixed: true,
    });
    expect(state.saved).toBe(true);
    expect(state.errors).toEqual({});
  });

  it("an income keeps the amount positive too", async () => {
    vi.mocked(createMovement).mockResolvedValue({ ok: true });
    await createMovementAction(EMPTY, form({ ...VALID, kind: "income" }));
    expect(createMovement).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "income", amountCents: 1250 }),
    );
  });

  it("the optional data can be left out", async () => {
    vi.mocked(createMovement).mockResolvedValue({ ok: true });
    await createMovementAction(
      EMPTY,
      form({
        kind: "income",
        amount: "0",
        date: "2026-11-01",
        accountId: ACCOUNT,
        workKind: "freelance",
      }),
    );
    expect(createMovement).toHaveBeenCalledWith({
      kind: "income",
      amountCents: 0,
      date: "2026-11-01",
      accountId: ACCOUNT,
      workKind: "freelance",
      description: null,
      categoryId: null,
      subcategoryId: null,
      isFixed: false,
    });
  });
});

describe("A required data is missing (the server repeats the check)", () => {
  it("saves nothing and keeps what was typed, with a message per field", async () => {
    const state = await createMovementAction(
      EMPTY,
      form({ ...VALID, kind: "", amount: "", accountId: "", workKind: "" }),
    );
    expect(createMovement).not.toHaveBeenCalled();
    expect(state.saved).toBe(false);
    expect(state.errors).toEqual({
      kind: "Elige tipo de movimiento",
      amount: "El importe no puede estar vacío",
      account: "Debes elegir una cuenta",
      workKind: true,
    });
    expect(state.values).toMatchObject({
      description: "  cena anoche ",
      categoryId: CATEGORY,
      subcategoryId: SUBCATEGORY,
      isFixed: true,
    });
  });
});

describe("Saving with an account or a category that no longer exists", () => {
  it("clears only the account when it is gone and keeps the rest", async () => {
    vi.mocked(createMovement).mockResolvedValue({
      ok: false,
      error: ACCOUNT_GONE,
    });
    const state = await createMovementAction(EMPTY, form(VALID));
    expect(state.message).toBe(ACCOUNT_GONE);
    expect(state.saved).toBe(false);
    expect(state.values).toMatchObject({
      accountId: "",
      categoryId: CATEGORY,
      subcategoryId: SUBCATEGORY,
      amount: "12,50",
      description: "  cena anoche ",
    });
  });

  it("clears the category and its subcategory when the category is gone", async () => {
    vi.mocked(createMovement).mockResolvedValue({
      ok: false,
      error: CATEGORY_GONE,
    });
    const state = await createMovementAction(EMPTY, form(VALID));
    expect(state.message).toBe(CATEGORY_GONE);
    expect(state.values).toMatchObject({
      accountId: ACCOUNT,
      categoryId: "",
      subcategoryId: "",
    });
  });

  it("clears only the subcategory when it is gone", async () => {
    vi.mocked(createMovement).mockResolvedValue({
      ok: false,
      error: SUBCATEGORY_GONE,
    });
    const state = await createMovementAction(EMPTY, form(VALID));
    expect(state.message).toBe(SUBCATEGORY_GONE);
    expect(state.values).toMatchObject({
      categoryId: CATEGORY,
      subcategoryId: "",
    });
  });
});

describe("Editing saved movements", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };

  it("saves the changes of one movement with the rules of the quick entry", async () => {
    vi.mocked(updateMovement).mockResolvedValue({ ok: true });
    const state = await updateMovementAction(
      EMPTY,
      form({
        id: "m1",
        kind: "expense",
        amount: "5,5",
        accountId: ACCOUNT,
        workKind: "personal",
      }),
    );
    expect(state.saved).toBe(true);
    expect(updateMovement).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ amountCents: 550, kind: "expense" }),
    );
  });

  it("refuses an invalid movement without saving", async () => {
    vi.mocked(updateMovement).mockReset();
    const state = await updateMovementAction(EMPTY, form({ id: "m1" }));
    expect(state.errors.amount).toBe("El importe no puede estar vacío");
    expect(updateMovement).not.toHaveBeenCalled();
  });

  it("checks a bulk change again on the server and applies it to the ids", async () => {
    vi.mocked(patchMovements).mockResolvedValue({ ok: true });
    expect(
      await patchMovementsAction(["m1", "m2"], {
        field: "workKind",
        value: "freelance",
        subcategory: "",
      }),
    ).toBeNull();
    expect(patchMovements).toHaveBeenCalledWith(["m1", "m2"], {
      workKind: "freelance",
    });

    vi.mocked(patchMovements).mockClear();
    expect(
      await patchMovementsAction(["m1"], {
        field: "amount",
        value: "-1",
        subcategory: "",
      }),
    ).toBe("Introduce un importe válido");
    expect(patchMovements).not.toHaveBeenCalled();
  });

  it("tells how many movements were deleted", async () => {
    vi.mocked(deleteMovements).mockResolvedValue(2);
    expect(await deleteMovementsAction(["m1", "m2"])).toBe(2);
  });
});
