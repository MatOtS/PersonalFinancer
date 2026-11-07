import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";
import { uniqueName } from "./support/names";
import {
  savedUserASession,
  sessionFromCookies,
} from "./support/session-cookies";
import { signInThroughForm } from "./support/sign-in";
import { userB } from "./support/users";

// Ownership scenarios of spec 003. userA is the shared session of the tests;
// userB signs in through the form in a context of its own. The database itself
// has to refuse B (row level security), whatever the app does, so B talks to the
// REST API directly with its own token.

const signedOut = { cookies: [], origins: [] };
const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const headers = (token: string) => ({
  apikey: apiKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  // Ask for the changed rows back, to see whether anything changed.
  Prefer: "return=representation",
});

async function userBToken(browser: Browser) {
  const context = await browser.newContext({ storageState: signedOut });
  const page = await context.newPage();
  await signInThroughForm(page, userB);
  const token = sessionFromCookies(await context.cookies()).access_token;
  return { context, page, token };
}

async function insertAs(
  request: APIRequestContext,
  token: string,
  table: "accounts" | "categories",
  row: Record<string, unknown>,
) {
  const response = await request.post(`${apiUrl}/${table}`, {
    headers: headers(token),
    data: row,
  });
  return response;
}

test("one user cannot see another user's data in the settings page", async ({
  page,
  browser,
}) => {
  const name = uniqueName("BBVA");
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Añadir cuenta" });
  await form.getByLabel("Nombre").fill(name);
  await form.getByRole("button", { name: "Añadir cuenta" }).click();
  await expect(page.locator("#cuentas").getByText(name)).toBeVisible();

  const b = await userBToken(browser);
  await b.page.goto("/ajustes");
  await expect(
    b.page.getByRole("heading", { level: 1, name: "Ajustes" }),
  ).toBeVisible();
  await expect(b.page.getByText(name)).toHaveCount(0);
  await b.context.close();
});

test("one user cannot change another user's data through the API", async ({
  browser,
  request,
}) => {
  const a = savedUserASession().access_token;
  const b = await userBToken(browser);

  // userA's rows, made directly in the API with A's own token.
  const accountName = uniqueName("Cuenta de A");
  const categoryName = uniqueName("Categoría de A");
  const account = await insertAs(request, a, "accounts", {
    name: accountName,
    name_key: accountName.toLowerCase(),
  });
  expect(account.ok()).toBe(true);
  const [{ id: accountId }] = await account.json();
  const category = await insertAs(request, a, "categories", {
    kind: "expense",
    name: categoryName,
    name_key: categoryName.toLowerCase(),
  });
  expect(category.ok()).toBe(true);
  const [{ id: categoryId }] = await category.json();

  // B cannot see them.
  for (const [table, id] of [
    ["accounts", accountId],
    ["categories", categoryId],
  ]) {
    const seen = await request.get(`${apiUrl}/${table}?id=eq.${id}`, {
      headers: headers(b.token),
    });
    expect(await seen.json()).toEqual([]);
  }

  // B cannot rename them: no row matches for B, so nothing is changed.
  for (const [table, id] of [
    ["accounts", accountId],
    ["categories", categoryId],
  ]) {
    const renamed = await request.patch(`${apiUrl}/${table}?id=eq.${id}`, {
      headers: headers(b.token),
      data: { name: "hackeado", name_key: "hackeado" },
    });
    expect(await renamed.json()).toEqual([]);
  }

  // B cannot delete them.
  for (const [table, id] of [
    ["accounts", accountId],
    ["categories", categoryId],
  ]) {
    const deleted = await request.delete(`${apiUrl}/${table}?id=eq.${id}`, {
      headers: headers(b.token),
    });
    expect(await deleted.json()).toEqual([]);
  }

  // B cannot add a subcategory to A's category.
  const intruder = await insertAs(request, b.token, "categories", {
    parent_id: categoryId,
    kind: "expense",
    name: "intruso",
    name_key: "intruso",
  });
  expect(intruder.ok()).toBe(false);

  // A's data is unchanged.
  const mine = await request.get(
    `${apiUrl}/accounts?id=eq.${accountId}&select=name`,
    { headers: headers(a) },
  );
  expect(await mine.json()).toEqual([{ name: accountName }]);
  const myCategory = await request.get(
    `${apiUrl}/categories?or=(id.eq.${categoryId},parent_id.eq.${categoryId})&select=name`,
    { headers: headers(a) },
  );
  expect(await myCategory.json()).toEqual([{ name: categoryName }]);

  await b.context.close();
});
