import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAccount,
  deleteAccount,
  renameAccount,
  setOpeningBalance,
} from "@/data/accounts";
import {
  addAccountAction,
  deleteAccountAction,
  updateAccountAction,
  type AccountFormState,
} from "./actions";

// The data layer and Next's cache are replaced, so only what the actions do
// themselves is tested: read the form, validate, call the data layer, answer
// with the exact Spanish message and refresh the list.
vi.mock("@/data/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/accounts")>()),
  createAccount: vi.fn(),
  renameAccount: vi.fn(),
  setOpeningBalance: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ID = "a0000000-0000-0000-0000-000000000001";
const EMPTY: AccountFormState = {
  name: "",
  openingBalance: "",
  errors: {},
  message: null,
  saved: false,
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.mocked(createAccount).mockReset();
  vi.mocked(renameAccount).mockReset();
  vi.mocked(setOpeningBalance).mockReset();
  vi.mocked(deleteAccount).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("addAccountAction", () => {
  it("saves the account with its opening balance in cents and refreshes the list", async () => {
    vi.mocked(createAccount).mockResolvedValue({ ok: true });
    const state = await addAccountAction(
      EMPTY,
      form({ name: "Wise", openingBalance: "125,50" }),
    );
    expect(createAccount).toHaveBeenCalledWith({
      name: "Wise",
      openingBalanceCents: 12550,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.saved).toBe(true);
  });

  it("asks for a name and saves nothing when it is empty", async () => {
    const state = await addAccountAction(
      EMPTY,
      form({ name: "   ", openingBalance: "0" }),
    );
    expect(state.errors.name).toBe("Introduce un nombre");
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("refuses an amount that is not valid and keeps what was typed", async () => {
    const state = await addAccountAction(
      EMPTY,
      form({ name: "Wise", openingBalance: "12.5" }),
    );
    expect(state.errors.openingBalance).toBe("Introduce un importe válido");
    expect(state.name).toBe("Wise");
    expect(state.openingBalance).toBe("12.5");
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("says the name is taken when the account already exists", async () => {
    vi.mocked(createAccount).mockResolvedValue({
      ok: false,
      error: "Ya tienes una cuenta con ese nombre",
    });
    const state = await addAccountAction(
      EMPTY,
      form({ name: "Wise", openingBalance: "" }),
    );
    expect(state.errors.name).toBe("Ya tienes una cuenta con ese nombre");
    expect(state.saved).toBe(false);
  });
});

describe("updateAccountAction", () => {
  it("renames the account, corrects its opening balance and refreshes the list", async () => {
    vi.mocked(renameAccount).mockResolvedValue({ ok: true });
    vi.mocked(setOpeningBalance).mockResolvedValue({ ok: true });
    const state = await updateAccountAction(
      EMPTY,
      form({ id: ID, name: "Wise 2", openingBalance: "-35" }),
    );
    expect(renameAccount).toHaveBeenCalledWith(ID, "Wise 2");
    expect(setOpeningBalance).toHaveBeenCalledWith(ID, -3500);
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.saved).toBe(true);
  });

  it("refreshes the list even when the second save throws", async () => {
    vi.mocked(renameAccount).mockResolvedValue({ ok: true });
    vi.mocked(setOpeningBalance).mockRejectedValue(new Error("network"));
    await expect(
      updateAccountAction(
        EMPTY,
        form({ id: ID, name: "Wise 2", openingBalance: "0" }),
      ),
    ).rejects.toThrow("network");
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });

  it("says the account no longer exists and refreshes the list", async () => {
    vi.mocked(renameAccount).mockResolvedValue({
      ok: false,
      error: "Esta cuenta ya no existe",
    });
    const state = await updateAccountAction(
      EMPTY,
      form({ id: ID, name: "Wise", openingBalance: "0" }),
    );
    expect(state.message).toBe("Esta cuenta ya no existe");
    expect(setOpeningBalance).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });
});

describe("deleteAccountAction", () => {
  it("deletes the account and refreshes the list", async () => {
    vi.mocked(deleteAccount).mockResolvedValue({ ok: true });
    const state = await deleteAccountAction(
      { message: null },
      form({ id: ID }),
    );
    expect(deleteAccount).toHaveBeenCalledWith(ID);
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.message).toBeNull();
  });

  it("says the account no longer exists and still refreshes the list", async () => {
    vi.mocked(deleteAccount).mockResolvedValue({
      ok: false,
      error: "Esta cuenta ya no existe",
    });
    const state = await deleteAccountAction(
      { message: null },
      form({ id: ID }),
    );
    expect(state.message).toBe("Esta cuenta ya no existe");
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });
});
