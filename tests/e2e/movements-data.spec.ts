import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import {
  choose,
  createAccount,
  createCategory,
  deleteInSettings,
  fillRequired,
  openForm,
  save,
} from "./support/movement-form";
import { uniqueName } from "./support/names";
import {
  savedUserASession,
  sessionFromCookies,
} from "./support/session-cookies";
import { signInThroughForm } from "./support/sign-in";
import { userB } from "./support/users";

// What the database keeps of the movements of spec 004, checked straight in
// the REST API with the token of the user (as isolation.spec.ts does). userA
// is the shared session; userB signs in through the form in a context of its
// own and has to be refused by the database, whatever the app does.

const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const headers = (token: string) => ({
  apikey: apiKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

type MovementRow = {
  id: string;
  user_id: string;
  amount_cents: number;
  category_id: string | null;
  subcategory_id: string | null;
};

async function idOf(request: APIRequestContext, name: string) {
  const token = savedUserASession().access_token;
  const response = await request.get(
    `${apiUrl}/accounts?name=eq.${encodeURIComponent(name)}&select=id`,
    { headers: headers(token) },
  );
  const rows = (await response.json()) as { id: string }[];
  return rows[0]!.id;
}

async function movementsOf(request: APIRequestContext, accountId: string) {
  const token = savedUserASession().access_token;
  const response = await request.get(
    `${apiUrl}/movements?account_id=eq.${accountId}&select=id,user_id,amount_cents,category_id,subcategory_id`,
    { headers: headers(token) },
  );
  return (await response.json()) as MovementRow[];
}

// Saves a movement of 10 euros through the form, with the category and the
// subcategory when they are given.
async function saveMovement(
  page: Page,
  account: string,
  category?: { name: string; sub: string },
) {
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  if (category) {
    await choose(page, dialog, "Categoría", category.name);
    await choose(page, dialog, "Subcategoría", category.sub);
  }
  await save(page, dialog);
  await expect(
    page.getByText("Movimiento añadido con éxito").first(),
  ).toBeVisible();
}

test.describe("what happens to the movements", () => {
  test.beforeEach(({ page }) => watchConsole(page));
  test.afterEach(({ page }) => expectNoConsoleErrors(page));

  test("deleting an account deletes its movements", async ({
    page,
    request,
  }) => {
    const account = uniqueName("Cuenta");
    await createAccount(page, account);
    await saveMovement(page, account);
    const id = await idOf(request, account);
    expect(await movementsOf(request, id)).toHaveLength(1);

    await deleteInSettings(page, account, "¿Eliminar la cuenta?");
    expect(await movementsOf(request, id)).toEqual([]);
  });

  test("deleting a category keeps the movement without its category and subcategory", async ({
    page,
    request,
  }) => {
    const account = uniqueName("Cuenta");
    const category = uniqueName("Cat");
    const sub = uniqueName("Sub");
    await createAccount(page, account);
    await createCategory(page, category, sub);
    await saveMovement(page, account, { name: category, sub });
    const id = await idOf(request, account);
    const [before] = await movementsOf(request, id);
    expect(before!.category_id).not.toBeNull();
    expect(before!.subcategory_id).not.toBeNull();

    await deleteInSettings(page, category, "¿Eliminar la categoría?");
    const after = await movementsOf(request, id);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      id: before!.id,
      user_id: before!.user_id,
      amount_cents: 1000,
      category_id: null,
      subcategory_id: null,
    });
  });

  test("deleting a subcategory keeps the movement and its category", async ({
    page,
    request,
  }) => {
    const account = uniqueName("Cuenta");
    const category = uniqueName("Cat");
    const sub = uniqueName("Sub");
    await createAccount(page, account);
    await createCategory(page, category, sub);
    await saveMovement(page, account, { name: category, sub });
    const id = await idOf(request, account);
    const [before] = await movementsOf(request, id);

    await deleteInSettings(page, sub, "¿Eliminar la subcategoría?");
    const after = await movementsOf(request, id);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      category_id: before!.category_id,
      subcategory_id: null,
    });
  });
});

test("one user cannot use, see or change another user's movements through the API", async ({
  page,
  browser,
  request,
}) => {
  // A has an account with a movement, saved through the form.
  const account = uniqueName("Cuenta de A");
  await createAccount(page, account);
  await saveMovement(page, account);
  const accountId = await idOf(request, account);
  const [movement] = await movementsOf(request, accountId);

  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const other = await context.newPage();
  await signInThroughForm(other, userB);
  const b = sessionFromCookies(await context.cookies()).access_token;

  // B cannot save a movement in A's account.
  const insert = await request.post(`${apiUrl}/movements`, {
    headers: headers(b),
    data: {
      kind: "expense",
      amount_cents: 1,
      date: "2026-11-18",
      account_id: accountId,
      work_kind: "personal",
    },
  });
  expect(insert.status()).toBe(409);
  expect((await insert.json()).code).toBe("23503");

  // B sees nothing of A, and cannot change or delete A's movement.
  const list = await request.get(`${apiUrl}/movements?id=eq.${movement!.id}`, {
    headers: headers(b),
  });
  expect(await list.json()).toEqual([]);
  const change = await request.patch(
    `${apiUrl}/movements?id=eq.${movement!.id}`,
    { headers: headers(b), data: { amount_cents: 1 } },
  );
  expect(await change.json()).toEqual([]);
  const remove = await request.delete(
    `${apiUrl}/movements?id=eq.${movement!.id}`,
    { headers: headers(b) },
  );
  expect(await remove.json()).toEqual([]);
  await context.close();

  // A's movement is intact.
  expect(await movementsOf(request, accountId)).toEqual([movement]);
});
