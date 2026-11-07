import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";
import { uniqueName } from "./support/names";
import { signInThroughForm } from "./support/sign-in";
import { userC } from "./support/users";

// Browser tests of the scenarios of spec 003. A test starts signed in as userA
// (auth.setup.ts) and the tests run at the same time, so each one only touches
// rows whose name it made unique. The local database is reset before every
// run, so nothing needs cleaning up afterwards.

const signedOut = { cookies: [], origins: [] };

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

// ---------------------------------------------------------------- accounts --

const accounts = (page: Page) => page.locator("#cuentas");

async function addAccount(page: Page, name: string, balance = "") {
  const form = page.getByRole("form", { name: "Añadir cuenta" });
  await form.getByLabel("Nombre").fill(name);
  await form.getByLabel("Saldo inicial").fill(balance);
  await form.getByRole("button", { name: "Añadir cuenta" }).click();
}

const accountRow = (page: Page, name: string) =>
  accounts(page).getByRole("listitem").filter({ hasText: name });

async function confirmDelete(page: Page, title: string) {
  const dialog = page.getByRole("dialog", { name: title });
  await dialog.getByRole("button", { name: "Eliminar" }).click();
}

test.describe("accounts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ajustes");
  });

  test("the user adds an account", async ({ page }) => {
    const name = uniqueName("BBVA");
    await addAccount(page, name, "1.250,00");
    await expect(accountRow(page, name)).toContainText("1.250,00 €");
  });

  test("the user renames an account", async ({ page }) => {
    const name = uniqueName("BBVA");
    await addAccount(page, name, "1.250,00");
    await expect(accountRow(page, name)).toBeVisible();

    await page.getByRole("button", { name: `Editar ${name}` }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    const renamed = `${name} Nómina`;
    await form.getByLabel("Nombre").fill(renamed);
    await form.getByRole("button", { name: "Guardar" }).click();

    await expect(accountRow(page, renamed)).toContainText("1.250,00 €");
    await expect(accounts(page).getByText(name, { exact: true })).toHaveCount(
      0,
    );
  });

  test("the user corrects the opening balance of an account", async ({
    page,
  }) => {
    const name = uniqueName("BBVA");
    await addAccount(page, name, "1.250,00");
    await expect(accountRow(page, name)).toBeVisible();

    await page.getByRole("button", { name: `Editar ${name}` }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    await form.getByLabel("Saldo inicial").fill("1.300,00");
    await form.getByRole("button", { name: "Guardar" }).click();

    await expect(accountRow(page, name)).toContainText("1.300,00 €");
  });

  test("the user deletes an account", async ({ page }) => {
    const name = uniqueName("Wise");
    await addAccount(page, name);
    await expect(accountRow(page, name)).toBeVisible();

    await page.getByRole("button", { name: `Eliminar ${name}` }).click();
    await confirmDelete(page, "¿Eliminar la cuenta?");

    await expect(accountRow(page, name)).toHaveCount(0);
  });

  test("cancelling a deletion keeps everything (Cancelar and Escape)", async ({
    page,
  }) => {
    const name = uniqueName("Wise");
    await addAccount(page, name);
    const remove = page.getByRole("button", { name: `Eliminar ${name}` });
    await expect(remove).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar la cuenta?" });

    // The focus starts on "Cancelar", so an accidental Enter deletes nothing.
    await remove.click();
    await expect(
      dialog.getByRole("button", { name: "Cancelar" }),
    ).toBeFocused();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(accountRow(page, name)).toBeVisible();

    await remove.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(accountRow(page, name)).toBeVisible();
  });

  test("an account needs a name", async ({ page }) => {
    await addAccount(page, "   ");
    await expect(accounts(page).getByText("Introduce un nombre")).toBeVisible();
  });

  test("two accounts cannot have the same name (capitals and spaces ignored)", async ({
    page,
  }) => {
    const name = uniqueName("BBVA");
    await addAccount(page, name);
    await expect(accountRow(page, name)).toBeVisible();

    for (const again of [name, name.toLowerCase(), ` ${name} `]) {
      await addAccount(page, again);
      await expect(
        accounts(page).getByText("Ya tienes una cuenta con ese nombre"),
      ).toBeVisible();
    }
    await expect(accounts(page).getByText(name, { exact: true })).toHaveCount(
      1,
    );

    // Renaming another account to the same name is refused too.
    const other = uniqueName("Otra");
    await addAccount(page, other);
    await expect(accountRow(page, other)).toBeVisible();
    await page.getByRole("button", { name: `Editar ${other}` }).click();
    const form = page.getByRole("form", { name: `Editar ${other}` });
    await form.getByLabel("Nombre").fill(name.toLowerCase());
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(
      form.getByText("Ya tienes una cuenta con ese nombre"),
    ).toBeVisible();
  });

  test("spaces around a name are removed", async ({ page }) => {
    const name = uniqueName("Wise");
    await addAccount(page, `  ${name}  `);
    await expect(accounts(page).getByText(name, { exact: true })).toBeVisible();
  });

  test("a name has a maximum length of 50", async ({ page }) => {
    await addAccount(page, "a".repeat(51));
    await expect(
      accounts(page).getByText(
        "El nombre es demasiado largo (máximo 50 caracteres)",
      ),
    ).toBeVisible();

    const fifty = uniqueName("Larga").padEnd(50, "x");
    expect(fifty).toHaveLength(50);
    await addAccount(page, fifty);
    await expect(
      accounts(page).getByText(fifty, { exact: true }),
    ).toBeVisible();
  });

  test("the opening balance must be a valid amount", async ({ page }) => {
    for (const balance of ["abc", "12,345"]) {
      await addAccount(page, uniqueName("Mal"), balance);
      await expect(
        accounts(page).getByText("Introduce un importe válido"),
      ).toBeVisible();
    }
  });

  test("an empty opening balance counts as zero", async ({ page }) => {
    const name = uniqueName("Cero");
    await addAccount(page, name, "");
    await expect(accountRow(page, name)).toContainText("0,00 €");
  });

  test("the opening balance can be negative", async ({ page }) => {
    const name = uniqueName("Tarjeta");
    await addAccount(page, name, "-350");
    await expect(accountRow(page, name)).toContainText("-350,00 €");
  });

  test("lists are ordered alphabetically, ignoring capitals and accents", async ({
    page,
  }) => {
    const prefix = uniqueName("Orden");
    // Created out of order: Álamo < alba < bravo < Zulu.
    for (const suffix of ["bravo", "Zulu", "alba", "Álamo"]) {
      await addAccount(page, `${prefix} ${suffix}`);
      await expect(accountRow(page, `${prefix} ${suffix}`)).toBeVisible();
    }
    const names = await accounts(page)
      .locator("li span.font-semibold")
      .allInnerTexts();
    expect(names.filter((n) => n.startsWith(prefix))).toEqual([
      `${prefix} Álamo`,
      `${prefix} alba`,
      `${prefix} bravo`,
      `${prefix} Zulu`,
    ]);
  });
});

// -------------------------------------------------------------- categories --

const categories = (page: Page) => page.locator("#categorias");
const group = (page: Page, title: "Gastos" | "Ingresos") =>
  categories(page)
    .locator("div.mb-8")
    .filter({ has: page.getByRole("heading", { name: title }) });

async function addCategory(
  page: Page,
  kind: "gasto" | "ingreso",
  name: string,
) {
  const form = page.getByRole("form", { name: `Añadir categoría de ${kind}` });
  await form.getByLabel("Nombre").fill(name);
  await form.getByRole("button", { name: "Añadir categoría" }).click();
}

// `scope` is the page, or one group when the same name exists in both groups.
async function addSubcategory(
  page: Page,
  category: string,
  name: string,
  scope: Pick<Page, "getByRole"> = page,
) {
  await scope
    .getByRole("button", { name: `Añadir subcategoría a ${category}` })
    .click();
  const form = page.getByRole("form", {
    name: `Nueva subcategoría de ${category}`,
  });
  await form.getByLabel("Nombre").fill(name);
  await form.getByRole("button", { name: "Añadir" }).click();
}

const categoryRow = (page: Page, name: string) =>
  categories(page)
    .getByRole("listitem")
    .filter({ has: page.getByText(name, { exact: true }) })
    .first();

test.describe("categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ajustes");
  });

  test("the user adds a category under the group they used", async ({
    page,
  }) => {
    const spent = uniqueName("Gasto");
    const earned = uniqueName("Ingreso");
    await addCategory(page, "gasto", spent);
    await addCategory(page, "ingreso", earned);

    await expect(group(page, "Gastos").getByText(spent)).toBeVisible();
    await expect(group(page, "Ingresos").getByText(earned)).toBeVisible();
    await expect(group(page, "Ingresos").getByText(spent)).toHaveCount(0);
  });

  test("the user adds a subcategory", async ({ page }) => {
    const name = uniqueName("Alimentación");
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();

    // The button opens a line with a visible label and a placeholder.
    await page
      .getByRole("button", { name: `Añadir subcategoría a ${name}` })
      .click();
    const line = page.getByRole("form", {
      name: `Nueva subcategoría de ${name}`,
    });
    await expect(line.getByLabel("Nombre")).toBeFocused();
    await expect(line.getByLabel("Nombre")).toHaveAttribute(
      "placeholder",
      "Nueva subcategoría",
    );
    await line.getByLabel("Nombre").fill("Supermercado");
    await line.getByRole("button", { name: "Añadir" }).click();

    await expect(categoryRow(page, name)).toContainText("Supermercado");
    await expect(line).toBeHidden();
  });

  test("the user renames a category and a subcategory and keeps the structure", async ({
    page,
  }) => {
    const name = uniqueName("Alimentación");
    const sub = uniqueName("Super");
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();
    await addSubcategory(page, name, sub);
    await expect(categoryRow(page, name)).toContainText(sub);

    await page.getByRole("button", { name: `Editar ${sub}` }).click();
    const subForm = page.getByRole("form", { name: `Editar ${sub}` });
    await subForm.getByLabel("Nombre").fill(`${sub} 2`);
    await subForm.getByRole("button", { name: "Guardar" }).click();
    await expect(categoryRow(page, name)).toContainText(`${sub} 2`);

    await page.getByRole("button", { name: `Editar ${name}` }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    await form.getByLabel("Nombre").fill(`${name} 2`);
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(categoryRow(page, `${name} 2`)).toContainText(`${sub} 2`);
  });

  test("the user deletes a subcategory and its category remains", async ({
    page,
  }) => {
    const name = uniqueName("Ocio");
    const sub = uniqueName("Restaurantes");
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();
    await addSubcategory(page, name, sub);
    await expect(categoryRow(page, name)).toContainText(sub);

    await page.getByRole("button", { name: `Eliminar ${sub}` }).click();
    const dialog = page.getByRole("dialog", {
      name: "¿Eliminar la subcategoría?",
    });
    await expect(dialog).toContainText(
      `Se eliminará la subcategoría "${sub}". Esta acción no se puede deshacer.`,
    );
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(categories(page).getByText(sub)).toHaveCount(0);
    await expect(categoryRow(page, name)).toBeVisible();
  });

  test("deleting a category says how many subcategories go with it", async ({
    page,
  }) => {
    const name = uniqueName("Transporte");
    const [a, b] = [uniqueName("Taxi"), uniqueName("Tren")];
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();
    await addSubcategory(page, name, a);
    await expect(categoryRow(page, name)).toContainText(a);
    await addSubcategory(page, name, b);
    await expect(categoryRow(page, name)).toContainText(b);

    await page.getByRole("button", { name: `Eliminar ${name}` }).click();
    const dialog = page.getByRole("dialog", {
      name: "¿Eliminar la categoría?",
    });
    await expect(dialog).toContainText(
      `Se eliminará la categoría "${name}" con 2 subcategorías. Esta acción no se puede deshacer.`,
    );

    // Cancelling keeps everything.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(categoryRow(page, name)).toContainText(a);

    await page.getByRole("button", { name: `Eliminar ${name}` }).click();
    await dialog.getByRole("button", { name: "Eliminar" }).click();
    await expect(categories(page).getByText(name)).toHaveCount(0);
    await expect(categories(page).getByText(a)).toHaveCount(0);
    await expect(categories(page).getByText(b)).toHaveCount(0);
  });

  test("the type of a category cannot be changed, only its name", async ({
    page,
  }) => {
    const name = uniqueName("Alimentación");
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();

    await page.getByRole("button", { name: `Editar ${name}` }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    await expect(form.getByLabel("Nombre")).toBeVisible();
    await expect(form.getByRole("combobox")).toHaveCount(0);
    await expect(form.getByRole("radio")).toHaveCount(0);
  });

  test("a category or subcategory needs a name and cannot repeat one", async ({
    page,
  }) => {
    const name = uniqueName("Ocio");
    await addCategory(page, "gasto", name);
    await expect(categoryRow(page, name)).toBeVisible();

    await addCategory(page, "gasto", "  ");
    await expect(
      categories(page).getByText("Introduce un nombre"),
    ).toBeVisible();

    await addCategory(page, "gasto", name.toUpperCase());
    await expect(
      categories(page).getByText("Ya tienes una categoría con ese nombre"),
    ).toBeVisible();

    // The same name is allowed under the other type.
    await addCategory(page, "ingreso", name);
    await expect(group(page, "Ingresos").getByText(name)).toBeVisible();

    const expenses = group(page, "Gastos");
    await addSubcategory(page, name, "Cine", expenses);
    await expect(expenses.getByRole("listitem").first()).toBeVisible();
    await expect(expenses).toContainText("Cine");
    await addSubcategory(page, name, "cine", expenses);
    await expect(
      categories(page).getByText(
        "Ya tienes una subcategoría con ese nombre en esta categoría",
      ),
    ).toBeVisible();
  });

  test("categories are ordered alphabetically, ignoring capitals and accents", async ({
    page,
  }) => {
    const prefix = uniqueName("Orden");
    for (const suffix of ["bravo", "Zulu", "alba", "Álamo"]) {
      await addCategory(page, "gasto", `${prefix} ${suffix}`);
      await expect(categoryRow(page, `${prefix} ${suffix}`)).toBeVisible();
    }
    const names = await group(page, "Gastos")
      .locator("li span.font-semibold")
      .allInnerTexts();
    expect(names.filter((n) => n.startsWith(prefix))).toEqual([
      `${prefix} Álamo`,
      `${prefix} alba`,
      `${prefix} bravo`,
      `${prefix} Zulu`,
    ]);
  });
});

// --------------------------------------------- changing what is gone ("ya no existe") --

// The same user has the page open in two tabs and deletes the element in the
// first; the second still shows it and tries to rename or delete it.
async function secondTab(context: BrowserContext) {
  const other = await context.newPage();
  watchConsole(other);
  await other.goto("/ajustes");
  return other;
}

test.describe("changing something that no longer exists", () => {
  test("an account: rename and delete", async ({ page, context }) => {
    for (const action of ["rename", "delete"] as const) {
      const name = uniqueName("Wise");
      await page.goto("/ajustes");
      await addAccount(page, name);
      await expect(accountRow(page, name)).toBeVisible();
      const other = await secondTab(context);
      await expect(accountRow(other, name)).toBeVisible();

      await page.getByRole("button", { name: `Eliminar ${name}` }).click();
      await confirmDelete(page, "¿Eliminar la cuenta?");
      await expect(accountRow(page, name)).toHaveCount(0);

      if (action === "rename") {
        await other.getByRole("button", { name: `Editar ${name}` }).click();
        const form = other.getByRole("form", { name: `Editar ${name}` });
        await form.getByLabel("Nombre").fill(`${name} 2`);
        await form.getByRole("button", { name: "Guardar" }).click();
      } else {
        await other.getByRole("button", { name: `Eliminar ${name}` }).click();
        await confirmDelete(other, "¿Eliminar la cuenta?");
      }
      await expect(other.getByText("Esta cuenta ya no existe")).toBeVisible();
      await expect(accountRow(other, name)).toHaveCount(0);
      expectNoConsoleErrors(other);
      await other.close();
    }
  });

  test("a category: rename and delete", async ({ page, context }) => {
    for (const action of ["rename", "delete"] as const) {
      const name = uniqueName("Ocio");
      await page.goto("/ajustes");
      await addCategory(page, "gasto", name);
      await expect(categoryRow(page, name)).toBeVisible();
      const other = await secondTab(context);
      await expect(categoryRow(other, name)).toBeVisible();

      await page.getByRole("button", { name: `Eliminar ${name}` }).click();
      await page
        .getByRole("dialog", { name: "¿Eliminar la categoría?" })
        .getByRole("button", { name: "Eliminar" })
        .click();
      await expect(categories(page).getByText(name)).toHaveCount(0);

      if (action === "rename") {
        await other.getByRole("button", { name: `Editar ${name}` }).click();
        const form = other.getByRole("form", { name: `Editar ${name}` });
        await form.getByLabel("Nombre").fill(`${name} 2`);
        await form.getByRole("button", { name: "Guardar" }).click();
      } else {
        await other.getByRole("button", { name: `Eliminar ${name}` }).click();
        await other
          .getByRole("dialog", { name: "¿Eliminar la categoría?" })
          .getByRole("button", { name: "Eliminar" })
          .click();
      }
      await expect(
        other.getByText("Esta categoría ya no existe"),
      ).toBeVisible();
      await expect(categories(other).getByText(name)).toHaveCount(0);
      expectNoConsoleErrors(other);
      await other.close();
    }
  });

  test("a subcategory: rename and delete", async ({ page, context }) => {
    for (const action of ["rename", "delete"] as const) {
      const parent = uniqueName("Ocio");
      const sub = uniqueName("Cine");
      await page.goto("/ajustes");
      await addCategory(page, "gasto", parent);
      await expect(categoryRow(page, parent)).toBeVisible();
      await addSubcategory(page, parent, sub);
      await expect(categoryRow(page, parent)).toContainText(sub);
      const other = await secondTab(context);
      await expect(categoryRow(other, parent)).toContainText(sub);

      await page.getByRole("button", { name: `Eliminar ${sub}` }).click();
      await page
        .getByRole("dialog", { name: "¿Eliminar la subcategoría?" })
        .getByRole("button", { name: "Eliminar" })
        .click();
      await expect(categories(page).getByText(sub)).toHaveCount(0);

      if (action === "rename") {
        await other.getByRole("button", { name: `Editar ${sub}` }).click();
        const form = other.getByRole("form", { name: `Editar ${sub}` });
        await form.getByLabel("Nombre").fill(`${sub} 2`);
        await form.getByRole("button", { name: "Guardar" }).click();
      } else {
        await other.getByRole("button", { name: `Eliminar ${sub}` }).click();
        await other
          .getByRole("dialog", { name: "¿Eliminar la subcategoría?" })
          .getByRole("button", { name: "Eliminar" })
          .click();
      }
      await expect(
        other.getByText("Esta subcategoría ya no existe"),
      ).toBeVisible();
      await expect(categories(other).getByText(sub)).toHaveCount(0);
      expectNoConsoleErrors(other);
      await other.close();
    }
  });
});

// --------------------------------------------------------- where it lives --

test("settings is reached from the sidebar and marked as the current page", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Inicio" })).toBeVisible();
  await nav.getByRole("link", { name: "Ajustes" }).click();

  await expect(page).toHaveURL("/ajustes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ajustes" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cuentas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Categorías" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Ajustes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test.describe("without a session", () => {
  test.use({ storageState: signedOut });

  test("the settings page needs a session", async ({ page }) => {
    await page.goto("/ajustes");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

// --------------------------------------------- a user who has just arrived --

// userC never has accounts and nobody else touches C, so these two run in
// series: the first sees the default categories, the second changes them.
test.describe("a new user", () => {
  test.use({ storageState: signedOut });
  test.describe.configure({ mode: "serial" });

  const DEFAULTS: Record<string, string[]> = {
    Vivienda: ["Alquiler/Hipoteca", "Comunidad", "Mantenimiento"],
    Suministros: ["Luz", "Agua", "Gas", "Internet"],
    Alimentación: ["Supermercado", "Restaurantes"],
    Transporte: ["Combustible", "Transporte público", "Mantenimiento vehículo"],
    Ocio: ["Salidas", "Viajes", "Hobbies"],
    Suscripciones: ["Streaming", "Software personal"],
    "Material/Equipo freelance": ["Hardware", "Herramientas"],
    Software: ["Licencias", "SaaS"],
    Impuestos: ["IRPF", "IVA", "Autónomos"],
    Salud: ["Seguro médico", "Farmacia"],
    Otros: [],
  };
  const INCOME = ["Facturación", "Nómina", "Devoluciones", "Otros ingresos"];

  test("starts with the default categories and no accounts", async ({
    page,
  }) => {
    await signInThroughForm(page, userC);
    await page.goto("/ajustes");

    await expect(
      accounts(page).getByText("Aún no tienes cuentas."),
    ).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Añadir cuenta" }),
    ).toBeVisible();

    for (const [category, subcategories] of Object.entries(DEFAULTS)) {
      const row = group(page, "Gastos")
        .getByRole("listitem")
        .filter({ has: page.getByText(category, { exact: true }) })
        .first();
      await expect(row).toBeVisible();
      for (const sub of subcategories) await expect(row).toContainText(sub);
    }
    await expect(
      group(page, "Gastos").locator("li span.font-semibold"),
    ).toHaveCount(Object.keys(DEFAULTS).length);
    for (const category of INCOME) {
      await expect(
        group(page, "Ingresos").getByText(category, { exact: true }),
      ).toBeVisible();
    }
    await expect(group(page, "Ingresos").locator("li")).toHaveCount(
      INCOME.length,
    );
  });

  test("Home offers to add the first account", async ({ page }) => {
    await signInThroughForm(page, userC);
    await page.goto("/");
    await page.getByRole("link", { name: "Añadir cuenta" }).click();
    await expect(page).toHaveURL("/ajustes#cuentas");
    await expect(accounts(page)).toBeVisible();
  });

  test("default categories are given once and then belong to the user", async ({
    page,
    browser,
  }) => {
    await signInThroughForm(page, userC);
    await page.goto("/ajustes");

    // Delete one default category and rename another.
    await page.getByRole("button", { name: "Eliminar Ocio" }).click();
    await page
      .getByRole("dialog", { name: "¿Eliminar la categoría?" })
      .getByRole("button", { name: "Eliminar" })
      .click();
    await expect(
      categories(page).getByText("Ocio", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Editar Nómina" }).click();
    const form = page.getByRole("form", { name: "Editar Nómina" });
    await form.getByLabel("Nombre").fill("Salario");
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(
      categories(page).getByText("Salario", { exact: true }),
    ).toBeVisible();

    // Signing in again, from a new browser, does not bring them back.
    const again = await browser.newContext({ storageState: signedOut });
    const second = await again.newPage();
    await signInThroughForm(second, userC);
    await second.goto("/ajustes");
    await expect(
      categories(second).getByText("Salario", { exact: true }),
    ).toBeVisible();
    await expect(
      categories(second).getByText("Ocio", { exact: true }),
    ).toHaveCount(0);
    await expect(
      categories(second).getByText("Nómina", { exact: true }),
    ).toHaveCount(0);
    await again.close();
  });
});

// --------------------------------------------------------- keyboard only --

// Moves the focus with Tab until it reaches the element. The page has many
// buttons (every category and subcategory has some), so the limit is generous.
async function tabTo(page: Page, target: ReturnType<Page["locator"]>) {
  for (let step = 0; step < 250; step++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

test("add, rename and delete an account using only the keyboard", async ({
  page,
}) => {
  const name = uniqueName("Teclado");
  await page.goto("/ajustes");

  // Add: Tab to the fields, type, and Enter on the button.
  const form = page.getByRole("form", { name: "Añadir cuenta" });
  await tabTo(page, form.getByLabel("Nombre"));
  await page.keyboard.type(name);
  await page.keyboard.press("Tab");
  await expect(form.getByLabel("Saldo inicial")).toBeFocused();
  await page.keyboard.type("10");
  await page.keyboard.press("Tab");
  const add = form.getByRole("button", { name: "Añadir cuenta" });
  await expect(add).toBeFocused();
  await expect(add).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(accountRow(page, name)).toContainText("10,00 €");

  // Rename: Enter on "Editar", the focus starts on the name field.
  await tabTo(page, page.getByRole("button", { name: `Editar ${name}` }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("form", { name: `Editar ${name}` }).getByLabel("Nombre"),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.type(" 2");
  await page.keyboard.press("Enter");
  await expect(accountRow(page, `${name} 2`)).toBeVisible();

  // Delete: "Eliminar" opens the dialog with the focus on "Cancelar". Escape
  // closes it and gives the focus back; the second time Tab reaches "Eliminar".
  const remove = page.getByRole("button", { name: `Eliminar ${name} 2` });
  await tabTo(page, remove);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "¿Eliminar la cuenta?" });
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(remove).toBeFocused();
  await expect(accountRow(page, `${name} 2`)).toBeVisible();

  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Eliminar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(accountRow(page, `${name} 2`)).toHaveCount(0);
});

test("add a category and a subcategory using only the keyboard", async ({
  page,
}) => {
  const name = uniqueName("Teclado");
  await page.goto("/ajustes");

  const form = page.getByRole("form", { name: "Añadir categoría de gasto" });
  await tabTo(page, form.getByLabel("Nombre"));
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
  await expect(categoryRow(page, name)).toBeVisible();

  await tabTo(
    page,
    page.getByRole("button", { name: `Añadir subcategoría a ${name}` }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("form", { name: `Nueva subcategoría de ${name}` })
      .getByLabel("Nombre"),
  ).toBeFocused();
  await page.keyboard.type("Cine");
  await page.keyboard.press("Enter");
  await expect(categoryRow(page, name)).toContainText("Cine");
});
