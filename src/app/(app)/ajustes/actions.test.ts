import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAccount,
  deleteAccount,
  renameAccount,
  setOpeningBalance,
} from "@/data/accounts";
import {
  countSubcategories,
  createCategory,
  createSubcategory,
  deleteCategory,
  renameCategory,
} from "@/data/categories";
import {
  addAccountAction,
  addCategoryAction,
  addSubcategoryAction,
  countSubcategoriesAction,
  deleteAccountAction,
  deleteCategoryAction,
  renameCategoryAction,
  updateAccountAction,
  type AccountFormState,
  type CategoryFormState,
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
vi.mock("@/data/categories", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/categories")>()),
  createCategory: vi.fn(),
  createSubcategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
  countSubcategories: vi.fn(),
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

const CATEGORY_ID = "c0000000-0000-0000-0000-000000000001";
const PARENT_ID = "c0000000-0000-0000-0000-000000000002";
const EMPTY_CATEGORY: CategoryFormState = {
  name: "",
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
  vi.mocked(createCategory).mockReset();
  vi.mocked(createSubcategory).mockReset();
  vi.mocked(renameCategory).mockReset();
  vi.mocked(deleteCategory).mockReset();
  vi.mocked(countSubcategories).mockReset();
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

describe("addCategoryAction", () => {
  it("saves the category with the kind of its group and refreshes the list", async () => {
    vi.mocked(createCategory).mockResolvedValue({ ok: true });
    const state = await addCategoryAction(
      EMPTY_CATEGORY,
      form({ kind: "income", name: "Nómina" }),
    );
    expect(createCategory).toHaveBeenCalledWith({
      kind: "income",
      name: "Nómina",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.saved).toBe(true);
    expect(state.name).toBe("");
  });

  it("asks for a name and saves nothing when it is empty", async () => {
    const state = await addCategoryAction(
      EMPTY_CATEGORY,
      form({ kind: "expense", name: "  " }),
    );
    expect(state.errors.name).toBe("Introduce un nombre");
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("refuses a name of 51 characters and keeps what was typed", async () => {
    const name = "a".repeat(51);
    const state = await addCategoryAction(
      EMPTY_CATEGORY,
      form({ kind: "expense", name }),
    );
    expect(state.errors.name).toBe(
      "El nombre es demasiado largo (máximo 50 caracteres)",
    );
    expect(state.name).toBe(name);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("says the name is taken when the category already exists", async () => {
    vi.mocked(createCategory).mockResolvedValue({
      ok: false,
      error: "Ya tienes una categoría con ese nombre",
    });
    const state = await addCategoryAction(
      EMPTY_CATEGORY,
      form({ kind: "expense", name: "Ocio" }),
    );
    expect(state.errors.name).toBe("Ya tienes una categoría con ese nombre");
    expect(state.saved).toBe(false);
  });

  it("does not trust a kind that is neither expense nor income", async () => {
    await expect(
      addCategoryAction(EMPTY_CATEGORY, form({ kind: "other", name: "Ocio" })),
    ).rejects.toThrow("kind");
    expect(createCategory).not.toHaveBeenCalled();
  });
});

describe("addSubcategoryAction", () => {
  it("saves the subcategory under its category and refreshes the list", async () => {
    vi.mocked(createSubcategory).mockResolvedValue({ ok: true });
    const state = await addSubcategoryAction(
      EMPTY_CATEGORY,
      form({ parentId: PARENT_ID, name: "Supermercado" }),
    );
    expect(createSubcategory).toHaveBeenCalledWith(PARENT_ID, "Supermercado");
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.saved).toBe(true);
  });

  it("asks for a name and saves nothing when it is empty", async () => {
    const state = await addSubcategoryAction(
      EMPTY_CATEGORY,
      form({ parentId: PARENT_ID, name: "" }),
    );
    expect(state.errors.name).toBe("Introduce un nombre");
    expect(createSubcategory).not.toHaveBeenCalled();
  });

  it("says the name is taken in that category", async () => {
    vi.mocked(createSubcategory).mockResolvedValue({
      ok: false,
      error: "Ya tienes una subcategoría con ese nombre en esta categoría",
    });
    const state = await addSubcategoryAction(
      EMPTY_CATEGORY,
      form({ parentId: PARENT_ID, name: "Luz" }),
    );
    expect(state.errors.name).toBe(
      "Ya tienes una subcategoría con ese nombre en esta categoría",
    );
  });

  it("says the category no longer exists and refreshes the list", async () => {
    vi.mocked(createSubcategory).mockResolvedValue({
      ok: false,
      error: "Esta categoría ya no existe",
    });
    const state = await addSubcategoryAction(
      EMPTY_CATEGORY,
      form({ parentId: PARENT_ID, name: "Luz" }),
    );
    expect(state.message).toBe("Esta categoría ya no existe");
    expect(state.errors).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });
});

describe("renameCategoryAction", () => {
  it("renames a category (empty parentId) and refreshes the list", async () => {
    vi.mocked(renameCategory).mockResolvedValue({ ok: true });
    const state = await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: "", name: "Comida" }),
    );
    expect(renameCategory).toHaveBeenCalledWith(
      { id: CATEGORY_ID, parentId: null },
      "Comida",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.saved).toBe(true);
  });

  it("renames a subcategory with its parentId", async () => {
    vi.mocked(renameCategory).mockResolvedValue({ ok: true });
    await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: PARENT_ID, name: "Mercado" }),
    );
    expect(renameCategory).toHaveBeenCalledWith(
      { id: CATEGORY_ID, parentId: PARENT_ID },
      "Mercado",
    );
  });

  it("asks for a name and saves nothing when it is empty", async () => {
    const state = await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: "", name: " " }),
    );
    expect(state.errors.name).toBe("Introduce un nombre");
    expect(renameCategory).not.toHaveBeenCalled();
  });

  it("says the name is taken", async () => {
    vi.mocked(renameCategory).mockResolvedValue({
      ok: false,
      error: "Ya tienes una categoría con ese nombre",
    });
    const state = await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: "", name: "Ocio" }),
    );
    expect(state.errors.name).toBe("Ya tienes una categoría con ese nombre");
  });

  it("says the category no longer exists and refreshes the list", async () => {
    vi.mocked(renameCategory).mockResolvedValue({
      ok: false,
      error: "Esta categoría ya no existe",
    });
    const state = await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: "", name: "Ocio" }),
    );
    expect(state.message).toBe("Esta categoría ya no existe");
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });

  it("says the subcategory no longer exists", async () => {
    vi.mocked(renameCategory).mockResolvedValue({
      ok: false,
      error: "Esta subcategoría ya no existe",
    });
    const state = await renameCategoryAction(
      EMPTY_CATEGORY,
      form({ id: CATEGORY_ID, parentId: PARENT_ID, name: "Luz" }),
    );
    expect(state.message).toBe("Esta subcategoría ya no existe");
  });
});

describe("deleteCategoryAction", () => {
  it("deletes a category and refreshes the list", async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: true });
    const state = await deleteCategoryAction(
      { message: null },
      form({ id: CATEGORY_ID, parentId: "" }),
    );
    expect(deleteCategory).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      parentId: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
    expect(state.message).toBeNull();
  });

  it("deletes a subcategory with its parentId", async () => {
    vi.mocked(deleteCategory).mockResolvedValue({ ok: true });
    await deleteCategoryAction(
      { message: null },
      form({ id: CATEGORY_ID, parentId: PARENT_ID }),
    );
    expect(deleteCategory).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      parentId: PARENT_ID,
    });
  });

  it("says it no longer exists and still refreshes the list", async () => {
    vi.mocked(deleteCategory).mockResolvedValue({
      ok: false,
      error: "Esta categoría ya no existe",
    });
    const state = await deleteCategoryAction(
      { message: null },
      form({ id: CATEGORY_ID, parentId: "" }),
    );
    expect(state.message).toBe("Esta categoría ya no existe");
    expect(revalidatePath).toHaveBeenCalledWith("/ajustes");
  });
});

describe("countSubcategoriesAction", () => {
  it("gives the number the data layer counts", async () => {
    vi.mocked(countSubcategories).mockResolvedValue(3);
    expect(await countSubcategoriesAction(CATEGORY_ID)).toBe(3);
    expect(countSubcategories).toHaveBeenCalledWith(CATEGORY_ID);
  });
});
