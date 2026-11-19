import { expect, test, type Page } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import { choose, createAccount } from "./support/movement-form";
import { uniqueName } from "./support/names";

// Browser tests of fixed expenses, clients and invoices (specs 006 to 010), as
// user A (the shared session). Each test uses names nobody else uses.

// The row of an invoice: only in the table of invoices (a client also shows in
// the table of the income by client).
const invoiceRow = (page: Page, client: string) =>
  page
    .getByRole("region", { name: "Facturas", exact: true })
    .getByRole("row")
    .filter({ hasText: client });

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

test("a fixed expense is added and listed with its frequency and amount", async ({
  page,
}) => {
  const name = uniqueName("Alquiler");
  // The home only shows its dashboard when the user has an account.
  await createAccount(page, uniqueName("Cuenta"));
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Añadir gasto fijo" });

  // Empty: the name, the amount and the frequency are asked.
  await form.getByRole("button", { name: "Añadir gasto fijo" }).click();
  await expect(form.getByText("Introduce un nombre")).toBeVisible();
  await expect(form.getByText("El importe no puede estar vacío")).toBeVisible();
  await expect(form.getByText("Elige una frecuencia")).toBeVisible();

  await form.getByLabel("Nombre").fill(name);
  await form.getByLabel("Importe").fill("800");
  await choose(page, form, "Frecuencia", "Mensual");
  await form.getByRole("button", { name: "Añadir gasto fijo" }).click();

  const item = page
    .locator("#gastos-fijos")
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(item).toContainText("Mensual");
  await expect(item).toContainText("800,00 €");
  // The choice of the frequency stays for the next one, the text is cleared.
  await expect(form.getByLabel("Nombre")).toHaveValue("");

  // And the home lists the active fixed expenses.
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Gastos fijos" }),
  ).toContainText(name);
});

test("a client is added with its fiscal data and can be edited", async ({
  page,
}) => {
  const name = uniqueName("Cliente");
  await page.goto("/ajustes");
  const add = page.getByRole("form", { name: "Añadir cliente" });

  await add.getByRole("button", { name: "Añadir cliente" }).click();
  await expect(add.getByText("Introduce un nombre")).toBeVisible();

  await add.getByLabel("Nombre").fill(name);
  await add.getByLabel("NIF o CIF").fill("B12345678");
  await add.getByRole("button", { name: "Añadir cliente" }).click();

  const edit = page.getByRole("form", { name: `Editar ${name}` });
  await expect(edit.getByLabel("NIF o CIF")).toHaveValue("B12345678");

  await edit.getByLabel("Dirección").fill("Calle Falsa 123");
  await edit.getByRole("button", { name: "Guardar cliente" }).click();
  await page.reload();
  await expect(
    page.getByRole("form", { name: `Editar ${name}` }).getByLabel("Dirección"),
  ).toHaveValue("Calle Falsa 123");
});

test("the billing data and defaults are saved", async ({ page }) => {
  await page.goto("/ajustes");
  const issuer = page.getByRole("form", {
    name: "Tus datos de facturación",
    exact: true,
  });
  await issuer.getByLabel("Nombre o razón social").fill("Mi Estudio SL");
  await issuer
    .getByRole("button", { name: "Guardar datos de facturación" })
    .click();
  await expect(issuer.getByRole("status")).toHaveText("Guardado");

  const billing = page.getByRole("form", { name: "Facturación", exact: true });
  await billing.getByLabel("Formato del número (YYYY y NNN)").fill("YYYY");
  await billing.getByRole("button", { name: "Guardar facturación" }).click();
  await expect(billing.getByText("El formato debe incluir NNN")).toBeVisible();
  await billing.getByLabel("Formato del número (YYYY y NNN)").fill("YYYY-NNN");
  await billing.getByRole("button", { name: "Guardar facturación" }).click();
  await expect(billing.getByRole("status")).toHaveText("Guardado");
});

test("an invoice goes from draft to issued with a number, has a PDF and is paid into an income", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const client = uniqueName("Cliente");
  await createAccount(page, account);

  await page.goto("/ajustes");
  const add = page.getByRole("form", { name: "Añadir cliente" });
  await add.getByLabel("Nombre").fill(client);
  await add.getByRole("button", { name: "Añadir cliente" }).click();
  await expect(
    page.getByRole("form", { name: `Editar ${client}` }),
  ).toBeVisible();

  // A draft: 2 x 100,00 + 21 % IVA - 15 % IRPF = 212,00.
  await page.goto("/facturas/nueva");
  const form = page.getByRole("form", { name: "Nueva factura" });
  await form.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(form.getByText("Elige un cliente")).toBeVisible();

  await choose(page, form, "Cliente", client);
  await form.getByLabel("Concepto 1").fill("Diseño");
  await form.getByLabel("Cantidad 1").fill("2");
  await form.getByLabel("Precio 1").fill("100");
  await expect(form.getByText("212,00 €")).toBeVisible();
  await form.getByRole("button", { name: "Guardar borrador" }).click();

  await expect(page).toHaveURL(/\/freelance$/);
  const row = invoiceRow(page, client);
  await expect(row).toContainText("Borrador");
  await expect(row).toContainText("212,00 €");
  await expect(row).toContainText("—"); // no number yet

  // Issuing gives the number and the PDF.
  await row.getByRole("button", { name: "Emitir" }).click();
  await expect(row).toContainText("Emitida");
  await expect(row).toContainText(/\d{4}-\d{3}/);
  const pdfLink = row.getByRole("link", { name: "PDF" });
  const href = await pdfLink.getAttribute("href");
  const pdf = await page.request.get(href ?? "");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // Paid: the income is in the home.
  await row.getByRole("button", { name: "Marcar como cobrada" }).click();
  await expect(row).toContainText("Cobrada");
  const number = (await row.textContent())?.match(/\d{4}-\d{3}/)?.[0] ?? "";
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Movimientos del periodo" }),
  ).toContainText(`Cobro factura ${number}`);
});

test("a draft can be edited and deleted, but an issued invoice cannot be deleted", async ({
  page,
}) => {
  const client = uniqueName("Cliente");
  await page.goto("/ajustes");
  const add = page.getByRole("form", { name: "Añadir cliente" });
  await add.getByLabel("Nombre").fill(client);
  await add.getByRole("button", { name: "Añadir cliente" }).click();
  await expect(
    page.getByRole("form", { name: `Editar ${client}` }),
  ).toBeVisible();

  await page.goto("/facturas/nueva");
  const form = page.getByRole("form", { name: "Nueva factura" });
  await choose(page, form, "Cliente", client);
  await form.getByLabel("Concepto 1").fill("Trabajo");
  await form.getByLabel("Precio 1").fill("50");
  await form.getByRole("button", { name: "Guardar borrador" }).click();

  // 50,00 + 21 % IVA - 15 % IRPF = 53,00.
  const row = invoiceRow(page, client);
  await expect(row).toContainText("53,00 €");

  // Edited: the price goes to 100,00 and the total to 106,00.
  await row.getByRole("link", { name: "Editar" }).click();
  const edit = page.getByRole("form", { name: "Editar factura" });
  await edit.getByLabel("Precio 1").fill("100");
  await edit.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(invoiceRow(page, client)).toContainText("106,00 €");

  // Deleted, after the confirmation.
  await page
    .getByRole("button", { name: `Eliminar el borrador de ${client}` })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(invoiceRow(page, client)).toHaveCount(0);

  // An issued invoice has no way to be deleted: its number stays in the series.
  await page.goto("/facturas/nueva");
  const again = page.getByRole("form", { name: "Nueva factura" });
  await choose(page, again, "Cliente", client);
  await again.getByLabel("Concepto 1").fill("Otro");
  await again.getByLabel("Precio 1").fill("10");
  await again.getByRole("button", { name: "Guardar borrador" }).click();
  const issued = invoiceRow(page, client);
  await issued.getByRole("button", { name: "Emitir" }).click();
  await expect(issued).toContainText("Emitida");
  await expect(issued.getByRole("button", { name: /Eliminar/ })).toHaveCount(0);
  await expect(issued.getByRole("link", { name: "Editar" })).toHaveCount(0);
});

// A 1 x 1 pixel png.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("the logo of the issuer must be a png or a jpg", async ({ page }) => {
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Logo" });

  await form.getByLabel(/Logo \(png o jpg/).setInputFiles({
    name: "logo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
  });
  await form.getByRole("button", { name: "Subir logo" }).click();
  await expect(
    form.getByText("El logo debe ser una imagen png o jpg"),
  ).toBeVisible();

  await form.getByLabel(/Logo \(png o jpg/).setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await form.getByRole("button", { name: "Subir logo" }).click();
  await expect(form.getByRole("status")).toHaveText("Logo guardado");
});
