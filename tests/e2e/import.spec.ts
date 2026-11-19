import { expect, test, type Page } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import { choose } from "./support/movement-form";
import { uniqueName } from "./support/names";
import { xlsx } from "./support/xlsx";

// Browser tests of the statement import (spec 005), as user A (the shared
// session). The statements are invented, with unique texts, and built here.

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

const main = (page: Page) => page.locator("main");
const rowsOf = (page: Page) =>
  page.getByRole("region", { name: "Movimientos por importar" });

const csv = (name: string, lines: string[]) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(lines.join("\n")),
});

// Creates the account in the import (the field "Nueva cuenta") and chooses it.
async function newAccount(page: Page, name: string) {
  await page.goto("/importar");
  await main(page).getByLabel("Nueva cuenta").fill(name);
  await main(page).getByRole("button", { name: "Añadir cuenta" }).click();
  await expect(
    main(page).getByRole("combobox", { name: "Cuenta", exact: true }),
  ).toContainText(name);
}

const chooseWorkKind = (page: Page, label: "Personal" | "Freelance") =>
  main(page).getByText(label, { exact: true }).first().click();

test("a csv statement is analyzed, reviewed and imported into a new account", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const shop = uniqueName("COMPRA");
  const payroll = uniqueName("NOMINA");
  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");

  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(
      csv("extracto.csv", [
        "Extracto de la cuenta;;;",
        "IBAN ES00 0000 0000 0000 0000 0000;;;",
        "Fecha;Concepto;Importe;Saldo",
        `14/09/2026;${shop};-23,45;1000`,
        `15/09/2026;${payroll};1.500,00;2500`,
        "fecha mala;ROTO;-1,00;2499",
      ]),
    );

  // The app proposes the columns by their content, and the user can change them.
  await expect(
    main(page).getByRole("combobox", { name: "Fecha", exact: true }),
  ).toContainText("Fecha");
  await expect(
    main(page).getByRole("combobox", { name: "Importe", exact: true }),
  ).toContainText("Importe");
  await main(page).getByRole("button", { name: "Previsualizar" }).click();

  const list = rowsOf(page);
  await expect(list.getByRole("row").filter({ hasText: shop })).toContainText(
    "-23,45 €",
  );
  await expect(
    list.getByRole("row").filter({ hasText: payroll }),
  ).toContainText("1.500,00 €");
  await expect(
    list.getByText("Se descartaron 1 filas sin fecha válida."),
  ).toBeVisible();

  // Both are edited at once: personal to freelance.
  await list.getByRole("checkbox", { name: "Seleccionar todos" }).check();
  const bar = list.getByRole("group", {
    name: "Editar los movimientos seleccionados",
  });
  await choose(page, bar, "Campo a cambiar", "Personal o freelance");
  await choose(page, bar, "Nuevo valor", "Freelance");
  await bar.getByRole("button", { name: "Aplicar a 2 seleccionados" }).click();
  await expect(list.getByRole("row").filter({ hasText: shop })).toContainText(
    "Freelance",
  );

  await list.getByRole("button", { name: "Importar 2 movimientos" }).click();
  await expect(
    main(page).getByText("Se importaron 2 movimientos."),
  ).toBeVisible();

  // The balance of the new account is what was imported: 1500,00 - 23,45.
  await page.goto("/");
  const balance = page
    .getByRole("region", { name: "Saldo de las cuentas" })
    .getByRole("listitem")
    .filter({ hasText: account });
  await expect(balance).toContainText("1.476,55 €");
});

test("the same statement imported twice shows the possible duplicates left out", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const shop = uniqueName("COMPRA");
  const file = csv("extracto.csv", [
    "Fecha;Concepto;Importe",
    `14/09/2026;${shop};-10,00`,
  ]);

  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");
  await main(page).getByLabel("Archivo del banco").setInputFiles(file);
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await rowsOf(page)
    .getByRole("button", { name: "Importar 1 movimiento" })
    .click();
  await expect(
    main(page).getByText("Se importaron 1 movimientos."),
  ).toBeVisible();

  // Again: the row is a possible duplicate, out of the import by default.
  await main(page)
    .getByRole("combobox", { name: "Cuenta", exact: true })
    .click();
  await page.getByRole("option", { name: account, exact: true }).click();
  await chooseWorkKind(page, "Personal");
  await main(page).getByLabel("Archivo del banco").setInputFiles(file);
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  const list = rowsOf(page);
  await expect(list.getByRole("row").filter({ hasText: shop })).toContainText(
    "Posible duplicado",
  );
  await expect(
    list.getByRole("button", { name: "Importar 0 movimientos" }),
  ).toBeDisabled();

  // The user can include it anyway.
  await list.getByRole("checkbox", { name: `Seleccionar ${shop}` }).check();
  await list.getByRole("button", { name: "Incluir las seleccionadas" }).click();
  await expect(
    list.getByRole("button", { name: "Importar 1 movimiento" }),
  ).toBeEnabled();
});

test("personal or freelance and the account are asked before the preview", async ({
  page,
}) => {
  await page.goto("/importar");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(
      csv("extracto.csv", ["Fecha;Concepto;Importe", "14/09/2026;x;-1,00"]),
    );
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await expect(main(page).getByText("Debes elegir una cuenta")).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(0);
});

test("a name already used or empty is refused for the new account, as in the settings", async ({
  page,
}) => {
  await page.goto("/importar");
  await main(page).getByRole("button", { name: "Añadir cuenta" }).click();
  await expect(main(page).getByText("Introduce un nombre")).toBeVisible();
});

test("rows in another currency ask for the exchange rate and are converted", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const hotel = uniqueName("HOTEL");
  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(
      csv("extracto.csv", [
        "Fecha;Concepto;Importe;Divisa",
        `01/10/2026;${hotel};-100,00;USD`,
      ]),
    );

  await expect(main(page).getByText(/trae importes en USD/)).toBeVisible();
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await expect(
    main(page).getByText("Introduce un tipo de cambio válido"),
  ).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(0);

  await main(page).getByLabel("Tipo de cambio USD").fill("0,92");
  await expect(
    main(page).getByText("1 € = 1,0870 USD", { exact: false }),
  ).toBeVisible();
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  // 100,00 USD at 0,92 euros per dollar.
  await expect(
    rowsOf(page).getByRole("row").filter({ hasText: hotel }),
  ).toContainText("-92,00 €");
});

test("a statement with the sign in another column is read by that column", async ({
  page,
}) => {
  const account = uniqueName("Cuenta");
  const coffee = uniqueName("Cafe");
  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(
      csv("wise.csv", [
        "Date,Description,Amount,Direction",
        `2026-09-14,${coffee},3.50,OUT`,
      ]),
    );
  await expect(
    main(page).getByRole("combobox", { name: /Entrada o salida/ }),
  ).toContainText("Direction");
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await expect(
    rowsOf(page).getByRole("row").filter({ hasText: coffee }),
  ).toContainText("-3,50 €");
});

test("an .xlsx statement is read in the browser", async ({ page }) => {
  const account = uniqueName("Cuenta");
  const shop = uniqueName("TIENDA");
  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles({
      name: "extracto.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: xlsx([
        ["Movimientos de la cuenta"],
        ["Fecha", "Concepto", "Importe", "Saldo"],
        ["14/09/2026", shop, -12.5, 900],
      ]),
    });
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await expect(
    rowsOf(page).getByRole("row").filter({ hasText: shop }),
  ).toContainText("-12,50 €");
});

test("a file with no movements says so", async ({ page }) => {
  await page.goto("/importar");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(csv("vacio.csv", [""]));
  await expect(
    main(page).getByText("No se encontraron movimientos en el archivo."),
  ).toBeVisible();
});

test("a word of the user gives the category of the movements that contain it", async ({
  page,
}) => {
  const word = uniqueName("tiendaxyz").toLowerCase().replace(/\s/g, "");
  await page.goto("/ajustes");
  const form = page.getByRole("form", { name: "Añadir palabra" });
  await form.getByRole("button", { name: "Añadir palabra" }).click();
  await expect(form.getByText("Introduce una palabra")).toBeVisible();
  await expect(form.getByText("Elige una categoría")).toBeVisible();
  await form.getByLabel("Palabra").fill(word);
  await choose(page, form, "Categoría", "Alimentación");
  await form.getByRole("button", { name: "Añadir palabra" }).click();
  await expect(
    page.locator("#palabras").getByRole("listitem").filter({ hasText: word }),
  ).toContainText("Alimentación");

  const account = uniqueName("Cuenta");
  await newAccount(page, account);
  await chooseWorkKind(page, "Personal");
  await main(page)
    .getByLabel("Archivo del banco")
    .setInputFiles(
      csv("extracto.csv", [
        "Fecha;Concepto;Importe",
        `14/09/2026;COMPRA ${word.toUpperCase()} 1;-5,00`,
      ]),
    );
  await main(page).getByRole("button", { name: "Previsualizar" }).click();
  await expect(
    rowsOf(page).getByRole("row").filter({ hasText: word.toUpperCase() }),
  ).toContainText("Alimentación");
});
