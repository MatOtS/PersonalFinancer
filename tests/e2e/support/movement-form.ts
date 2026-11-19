import { expect, type Locator, type Page } from "@playwright/test";

// Helpers of the browser tests of the quick entry form (spec 004).

export const openButton = (page: Page) =>
  page.getByRole("button", { name: "Añadir movimiento" });
export const movementDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Añadir movimiento" });

// Adds an account through the settings page and waits until it is listed.
export async function createAccount(page: Page, name: string) {
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Añadir cuenta" });
  await form.getByLabel("Nombre").fill(name);
  const answer = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/ajustes"),
  );
  await form.getByRole("button", { name: "Añadir cuenta" }).click();
  await answer;
  await expect(
    page.locator("#cuentas").getByRole("listitem").filter({ hasText: name }),
  ).toBeVisible();
}

// Opens the form from the top bar and waits until the lists are loaded.
export async function openForm(page: Page) {
  await openButton(page).click();
  const dialog = movementDialog(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Cuenta", exact: true }),
  ).toBeVisible();
  return dialog;
}

// Chooses an option in one of the lists of the form.
export async function choose(
  page: Page,
  dialog: Locator,
  list: string,
  option: string,
) {
  await dialog.getByRole("combobox", { name: list, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

// The text of the options of a list, in the order they are shown.
export async function optionsOf(page: Page, dialog: Locator, list: string) {
  await dialog.getByRole("combobox", { name: list, exact: true }).click();
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  const texts = await options.allTextContents();
  await page.keyboard.press("Escape");
  return texts;
}

// Today's date in Madrid as yyyy-mm-dd, like the form.
export const todayInMadrid = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Presses "Guardar" and waits until the attempt is over (the answer arrived
// and the button is back), so the next step does not read what a previous
// attempt left on the page.
export async function save(page: Page, dialog: Locator) {
  const answer = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await answer;
  // Saved: the dialog closes. Not saved: it stays and the button is back.
  await expect(async () => {
    if (await dialog.isVisible()) {
      await expect(dialog.getByRole("button", { name: "Guardar" })).toBeEnabled(
        { timeout: 500 },
      );
    }
  }).toPass();
}

// Fills what the form requires, with a valid movement of 10 euros.
export async function fillRequired(
  page: Page,
  dialog: Locator,
  account: string,
) {
  await dialog.getByText("Gasto", { exact: true }).click();
  await dialog.getByLabel("Importe").fill("10");
  await choose(page, dialog, "Cuenta", account);
  await dialog.getByText("Personal", { exact: true }).click();
}

// Adds a category with one subcategory through the settings page.
export async function createCategory(
  page: Page,
  name: string,
  subcategory: string,
) {
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Añadir categoría de gasto" });
  await form.getByLabel("Nombre").fill(name);
  await form.getByRole("button", { name: "Añadir categoría" }).click();
  const row = page
    .locator("#categorias")
    .getByRole("listitem")
    .filter({ hasText: name })
    .first();
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: `Añadir subcategoría a ${name}` })
    .click();
  const subForm = page.getByRole("form", {
    name: `Nueva subcategoría de ${name}`,
  });
  await subForm.getByLabel("Nombre").fill(subcategory);
  await subForm.getByRole("button", { name: "Añadir" }).click();
  await expect(row).toContainText(subcategory);
}

// Deletes something in the settings page of another tab, confirming it.
export async function deleteInSettings(
  page: Page,
  name: string,
  dialogTitle: string,
) {
  await page.goto("/ajustes");
  // The subcategories start folded: unfold every category (idempotent, and
  // repeated until the page has hydrated and reacts to the clicks).
  const target = page.getByRole("button", { name: `Eliminar ${name}` });
  await expect(async () => {
    await page.evaluate(() =>
      document
        .querySelectorAll<HTMLButtonElement>(
          '#categorias button[aria-expanded="false"]',
        )
        .forEach((button) => button.click()),
    );
    await expect(target).toBeVisible({ timeout: 1000 });
  }).toPass();
  await target.click();
  await page
    .getByRole("dialog", { name: dialogTitle })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(
    page.getByRole("button", { name: `Eliminar ${name}` }),
  ).toHaveCount(0);
}
