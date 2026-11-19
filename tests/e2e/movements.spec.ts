import { expect, test } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import {
  choose,
  createAccount,
  createCategory,
  deleteInSettings,
  fillRequired,
  movementDialog,
  openButton,
  openForm,
  optionsOf,
  save,
  todayInMadrid,
} from "./support/movement-form";
import { signInThroughForm } from "./support/sign-in";
import { userB } from "./support/users";
import { uniqueName } from "./support/names";

// Browser tests of the quick entry form of spec 004, as user A (the shared
// session). Each test makes its own account with a unique name, so the tests
// can run at the same time. The default categories of A are used as they are:
// the settings tests only change rows with unique names.

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

test("the form asks for all the data and starts as described", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);

  for (const label of [
    "Importe",
    "Fecha",
    "Descripción",
    "Cuenta",
    "Categoría",
    "Subcategoría",
    "Movimiento fijo",
  ]) {
    await expect(
      dialog.getByText(label, { exact: true }).first(),
    ).toBeVisible();
  }
  await expect(dialog.getByRole("radio", { name: "Gasto" })).not.toBeChecked();
  await expect(
    dialog.getByRole("radio", { name: "Ingreso" }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("radio", { name: "Personal" }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("radio", { name: "Freelance" }),
  ).not.toBeChecked();
  await expect(dialog.getByLabel("Fecha")).toHaveValue(todayInMadrid());
  await expect(dialog.getByLabel("Importe")).toHaveValue("");
  await expect(dialog.getByLabel("Descripción")).toHaveValue("");
  await expect(dialog.getByLabel("Movimiento fijo")).not.toBeChecked();
  await expect(dialog.getByRole("combobox", { name: "Cuenta" })).toContainText(
    "Elige una cuenta",
  );
});

test("the category list has expense and income categories, and the lists are alphabetical", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);

  const categories = await optionsOf(page, dialog, "Categoría");
  expect(categories).toContain("Alimentación");
  expect(categories).toContain("Nómina");
  // Alphabetical, with "Otros" always last.
  const others = categories.filter((name) => name === "Otros");
  const rest = categories.filter((name) => name !== "Otros");
  const sorted = [...rest].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
  expect(categories).toEqual([...sorted, ...others]);
});

test("a subcategory needs its category, and changing the category clears it", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);

  const subcategory = dialog.getByRole("combobox", { name: "Subcategoría" });
  await expect(subcategory).toBeDisabled();

  await choose(page, dialog, "Categoría", "Alimentación");
  await expect(subcategory).toBeEnabled();
  await choose(page, dialog, "Subcategoría", "Supermercado");
  await expect(subcategory).toContainText("Supermercado");

  await choose(page, dialog, "Categoría", "Transporte");
  await expect(subcategory).not.toContainText("Supermercado");
  await expect(subcategory).toContainText("Elige una subcategoría");
});

test("saving an expense closes the form, confirms it and counts in the account", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);

  await dialog.getByText("Gasto", { exact: true }).click();
  await dialog.getByLabel("Importe").fill("12,50");
  await dialog.getByLabel("Descripción").fill("  cena anoche  ");
  await choose(page, dialog, "Cuenta", account);
  await choose(page, dialog, "Categoría", "Alimentación");
  await choose(page, dialog, "Subcategoría", "Supermercado");
  await dialog.getByText("Personal", { exact: true }).click();
  await dialog.getByLabel("Movimiento fijo").check();
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
  await expect(movementDialog(page)).toBeHidden();
  await expect(openButton(page)).toBeFocused();

  // The movement is stored: the account says it has one.
  await page.goto("/ajustes");
  await page.getByRole("button", { name: `Eliminar ${account}` }).click();
  await expect(
    page.getByRole("dialog", { name: "¿Eliminar la cuenta?" }),
  ).toContainText(
    `que contiene 1 movimiento. Esta acción no se puede deshacer.`,
  );
});

test("an income with only the required data is saved", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);

  await dialog.getByText("Ingreso", { exact: true }).click();
  await dialog.getByLabel("Importe").fill("0");
  await choose(page, dialog, "Cuenta", account);
  await dialog.getByText("Freelance", { exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
  await expect(movementDialog(page)).toBeHidden();
});

test("closing the form discards what was typed", async ({ page }) => {
  await createAccount(page, uniqueName("Cuenta"));
  let dialog = await openForm(page);
  await dialog.getByLabel("Importe").fill("99");
  await dialog.getByLabel("Descripción").fill("algo");
  await dialog.getByText("Gasto", { exact: true }).click();

  await page.keyboard.press("Escape");
  await expect(movementDialog(page)).toBeHidden();

  dialog = await openForm(page);
  await expect(dialog.getByLabel("Importe")).toHaveValue("");
  await expect(dialog.getByLabel("Descripción")).toHaveValue("");
  await expect(dialog.getByRole("radio", { name: "Gasto" })).not.toBeChecked();
});

// ------------------------------------------------------------------ errors --

test("saving with the required data empty shows a message per field and keeps what was typed", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);
  await dialog.getByLabel("Descripción").fill("algo");
  await save(page, dialog);

  await expect(dialog.getByText("Elige tipo de movimiento")).toBeVisible();
  await expect(
    dialog.getByText("El importe no puede estar vacío"),
  ).toBeVisible();
  await expect(dialog.getByText("Debes elegir una cuenta")).toBeVisible();
  // Personal or freelance has no text: only its options are marked.
  await expect(
    dialog.getByRole("group", { name: "Personal o freelance" }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Descripción")).toHaveValue("algo");
  await expect(movementDialog(page)).toBeVisible();
});

test("the amount must be valid, and not too big", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);

  for (const [amount, message] of [
    ["abc", "Introduce un importe válido"],
    ["-5", "Introduce un importe válido"],
    ["12,345", "Introduce un importe válido"],
    ["1.000.000.000", "El importe es demasiado grande"],
  ]) {
    await dialog.getByLabel("Importe").fill(amount!);
    await save(page, dialog);
    await expect(dialog.getByText(message!)).toBeVisible();
    await expect(dialog.getByLabel("Importe")).toHaveValue(amount!);
    await expect(movementDialog(page)).toBeVisible();
  }
});

test("the biggest amount is accepted", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await dialog.getByLabel("Importe").fill("999.999.999,99");
  await save(page, dialog);
  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
});

test("the description has a maximum of 200 characters", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);

  await dialog.getByLabel("Descripción").fill("a".repeat(201));
  await save(page, dialog);
  await expect(
    dialog.getByText(
      "La descripción es demasiado larga (máximo 200 caracteres)",
    ),
  ).toBeVisible();

  await dialog.getByLabel("Descripción").fill("a".repeat(200));
  await save(page, dialog);
  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
});

test("a cleared date goes back to today without a message", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);
  await dialog.getByLabel("Fecha").fill("2020-01-31");
  await expect(dialog.getByLabel("Fecha")).toHaveValue("2020-01-31");
  await dialog.getByLabel("Fecha").fill("");
  await expect(dialog.getByLabel("Fecha")).toHaveValue(todayInMadrid());
});

test("any date is accepted, in the past or in the future", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  for (const date of ["1990-05-17", "2099-01-01"]) {
    const dialog = await openForm(page);
    await fillRequired(page, dialog, account);
    await dialog.getByLabel("Fecha").fill(date);
    await save(page, dialog);
    await expect(
      page.getByText("Movimiento añadido con éxito").first(),
    ).toBeVisible();
    await expect(movementDialog(page)).toBeHidden();
  }
});

// -------------------------------------------- something no longer exists --

test("the account was deleted in another tab: it says so, keeps the rest and clears only the account", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await dialog.getByLabel("Descripción").fill("cena anoche");

  const other = await page.context().newPage();
  await deleteInSettings(other, account, "¿Eliminar la cuenta?");
  await other.close();

  await save(page, dialog);
  await expect(dialog.getByText("Esta cuenta ya no existe")).toBeVisible();
  await expect(movementDialog(page)).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Cuenta", exact: true }),
  ).toContainText("Elige una cuenta");
  await expect(dialog.getByLabel("Importe")).toHaveValue("10");
  await expect(dialog.getByLabel("Descripción")).toHaveValue("cena anoche");
});

test("the category was deleted in another tab: it clears the category and its subcategory only", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const category = uniqueName("Cat");
  const sub = uniqueName("Sub");
  await createAccount(page, account);
  await createCategory(page, category, sub);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await choose(page, dialog, "Categoría", category);
  await choose(page, dialog, "Subcategoría", sub);

  const other = await page.context().newPage();
  await deleteInSettings(other, category, "¿Eliminar la categoría?");
  await other.close();

  await save(page, dialog);
  await expect(dialog.getByText("Esta categoría ya no existe")).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toContainText("Elige una categoría");
  await expect(
    dialog.getByRole("combobox", { name: "Subcategoría" }),
  ).toContainText("Elige una subcategoría");
  await expect(
    dialog.getByRole("combobox", { name: "Cuenta", exact: true }),
  ).toContainText(account);
});

test("the subcategory was deleted in another tab: it clears only the subcategory", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const category = uniqueName("Cat");
  const sub = uniqueName("Sub");
  await createAccount(page, account);
  await createCategory(page, category, sub);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await choose(page, dialog, "Categoría", category);
  await choose(page, dialog, "Subcategoría", sub);

  const other = await page.context().newPage();
  await deleteInSettings(other, sub, "¿Eliminar la subcategoría?");
  await other.close();

  await save(page, dialog);
  await expect(
    dialog.getByText("Esta subcategoría ya no existe"),
  ).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toContainText(category);
  await expect(
    dialog.getByRole("combobox", { name: "Subcategoría" }),
  ).toContainText("Elige una subcategoría");
});

// ----------------------------------------------------------- double click --

test("sending it twice in a row saves one movement", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await dialog.getByRole("button", { name: "Guardar" }).dblclick();
  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
  await expect(movementDialog(page)).toBeHidden();

  await page.goto("/ajustes");
  await page.getByRole("button", { name: `Eliminar ${account}` }).click();
  await expect(
    page.getByRole("dialog", { name: "¿Eliminar la cuenta?" }),
  ).toContainText("que contiene 1 movimiento.");
});

// ---------------------------------------------------------------- session --

test.describe("without a session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the app shows the sign-in page, with no button to add a movement", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(openButton(page)).toHaveCount(0);
  });

  // The scenario asks for the sign-in page. Today the proxy answers the Server
  // Action with a redirect and the browser fails with "An unexpected response
  // was received from the server" (the settings forms behave the same way).
  // Backlog bug 30: enable this test when the proxy handles Server Actions without a session.
  test.fixme("saving after the session ended shows the sign-in page and saves nothing", async ({
    page,
    context,
  }) => {
    // B has its own session, so ending it does not affect the other tests.
    await signInThroughForm(page, userB);
    const account = uniqueName("Cuenta");
    await createAccount(page, account);
    const dialog = await openForm(page);
    await fillRequired(page, dialog, account);

    await context.clearCookies();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test("a save with errors keeps the chosen type and the chosen personal or freelance", async ({
  page,
}) => {
  await createAccount(page, uniqueName("Cuenta"));
  const dialog = await openForm(page);
  await dialog.getByText("Ingreso", { exact: true }).click();
  await dialog.getByText("Freelance", { exact: true }).click();
  await save(page, dialog);

  // The amount and the account are missing: the form stays open.
  await expect(
    dialog.getByText("El importe no puede estar vacío"),
  ).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Ingreso" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "Freelance" })).toBeChecked();
});

test("the confirmation is green and disappears after 3 seconds", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await dialog.getByRole("button", { name: "Guardar" }).click();

  const toast = page.getByText("Movimiento añadido con éxito");
  await expect(toast).toBeVisible();
  const color = await toast
    .locator("xpath=ancestor::*[contains(@class,'bg-positive')][1]")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const positive = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--positive)";
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  expect(color).toBe(positive);
  await expect(toast).toBeHidden({ timeout: 5000 });
});
