import { expect, test, type Page } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import {
  choose,
  createAccount,
  fillRequired,
  openForm,
} from "./support/movement-form";
import { uniqueName } from "./support/names";

// Browser tests of the home dashboard (spec 011), as user A (the shared
// session): the movements of the period can be seen, edited, deleted, and
// edited or deleted several at once.

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

const panel = (page: Page) =>
  page.getByRole("region", { name: "Movimientos del periodo" });

// Registers an expense with a description through the quick entry.
async function addExpense(
  page: Page,
  account: string,
  description: string,
  amount: string,
) {
  await page.goto("/");
  const dialog = await openForm(page);
  await fillRequired(page, dialog, account);
  await dialog.getByLabel("Importe").fill(amount);
  await dialog.getByLabel("Descripción").fill(description);
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
}

test("the home shows the totals, the account balance and the movements of the period", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const description = uniqueName("Cena");
  await createAccount(page, account);
  await addExpense(page, account, description, "12,50");

  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  await expect(page.getByText("Entradas", { exact: true })).toBeVisible();
  await expect(page.getByText("Salidas", { exact: true })).toBeVisible();

  const balance = page
    .getByRole("region", { name: "Saldo de las cuentas" })
    .getByRole("listitem")
    .filter({ hasText: account });
  await expect(balance).toContainText("-12,50 €");

  const row = panel(page).getByRole("row").filter({ hasText: description });
  await expect(row).toContainText("-12,50 €");
  await expect(row).toContainText(account);
  await expect(
    page.getByRole("region", { name: "Gastos por categoría" }),
  ).toBeVisible();
});

test("one movement is edited with the form of the quick entry, and deleted", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const description = uniqueName("Compra");
  await createAccount(page, account);
  await addExpense(page, account, description, "10");

  await panel(page)
    .getByRole("button", { name: `Editar ${description}` })
    .click();
  const dialog = page.getByRole("dialog", { name: "Editar movimiento" });
  await expect(dialog.getByLabel("Importe")).toHaveValue("10,00");
  await dialog.getByLabel("Importe").fill("25");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByText("Movimiento actualizado con éxito"),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("row").filter({ hasText: description }),
  ).toContainText("-25,00 €");

  await panel(page)
    .getByRole("button", { name: `Eliminar ${description}` })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(
    panel(page).getByRole("row").filter({ hasText: description }),
  ).toHaveCount(0);
});

test("several movements are selected with the boxes and edited or deleted at once", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const first = uniqueName("Uno");
  const second = uniqueName("Dos");
  await createAccount(page, account);
  await addExpense(page, account, first, "1");
  await addExpense(page, account, second, "2");

  const box = (description: string) =>
    panel(page).getByRole("checkbox", { name: `Seleccionar ${description}` });
  await box(first).check();
  await box(second).check();

  // The same field changes in both: personal to freelance.
  const bar = panel(page).getByRole("group", {
    name: "Editar los movimientos seleccionados",
  });
  await choose(page, bar, "Campo a cambiar", "Personal o freelance");
  await choose(page, bar, "Nuevo valor", "Freelance");
  await bar.getByRole("button", { name: "Aplicar a 2 seleccionados" }).click();
  await expect(
    page.getByText("Movimientos actualizados con éxito"),
  ).toBeVisible();
  for (const description of [first, second]) {
    await expect(
      panel(page).getByRole("row").filter({ hasText: description }),
    ).toContainText("Freelance");
  }

  // A wrong value is refused with its message and nothing changes.
  await box(first).check();
  await choose(page, bar, "Campo a cambiar", "Importe");
  await bar.getByLabel("Nuevo importe").fill("abc");
  await bar.getByRole("button", { name: "Aplicar a 1 seleccionado" }).click();
  await expect(bar.getByText("Introduce un importe válido")).toBeVisible();

  // Deleted together, after the confirmation that says how many.
  await box(second).check();
  await bar.getByRole("button", { name: "Eliminar seleccionados" }).click();
  const confirm = page.getByRole("dialog", {
    name: "¿Eliminar los movimientos?",
  });
  await expect(confirm).toContainText("Se eliminarán 2 movimientos");
  await confirm.getByRole("button", { name: "Eliminar" }).click();
  for (const description of [first, second]) {
    await expect(
      panel(page).getByRole("row").filter({ hasText: description }),
    ).toHaveCount(0);
  }
});

test("the box of the header selects every row", async ({ page }) => {
  const account = uniqueName("Cuenta");
  await createAccount(page, account);
  await addExpense(page, account, uniqueName("A"), "1");
  await page.goto("/");

  await panel(page)
    .getByRole("checkbox", { name: "Seleccionar todos" })
    .check();
  const boxes = panel(page).getByRole("checkbox", {
    name: /^Seleccionar (?!todos)/,
  });
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await expect(boxes.nth(i)).toBeChecked();
  await expect(
    panel(page).getByRole("button", {
      name: `Aplicar a ${count} seleccionados`,
    }),
  ).toBeDisabled(); // no field chosen yet
});

test("the period can be changed and the page follows it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Última semana" }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  await expect(
    page.getByRole("button", { name: "Última semana" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the freelance dashboard shows the invoices and only the freelance movements", async ({
  page,
}) => {
  await page.goto("/freelance");
  await expect(
    page.getByRole("heading", { name: "Freelance", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Facturas pendientes de cobro")).toBeVisible();
  await expect(page.getByText("Borradores", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nueva factura" })).toBeVisible();
});
