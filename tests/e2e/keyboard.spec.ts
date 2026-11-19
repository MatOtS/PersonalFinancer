import { expect, test, type Page } from "@playwright/test";
import {
  createAccount,
  movementDialog,
  openButton,
} from "./support/movement-form";
import { uniqueName } from "./support/names";
import { signInThroughForm } from "./support/sign-in";
import { userB } from "./support/users";

// NFR accessibility: the whole flow works with the keyboard alone, and the
// element that has the focus can be seen. userB has its own session here,
// because signing out ends it.
test.use({ storageState: { cookies: [], origins: [] } });

test("sign in, move around the app and sign out using only the keyboard", async ({
  page,
}) => {
  // Sign in: Tab to each field, type, and Enter to send.
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.type(userB.email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Contraseña")).toBeFocused();
  await page.keyboard.type(userB.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");

  // Navigate: the menu, then the theme control (arrow keys change the option).
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Inicio" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ajustes" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Sistema" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Claro" })).toBeChecked();

  // Sign out: the focus is visible on the button, and Enter presses it.
  await page.keyboard.press("Tab");
  const signOut = page.getByRole("button", { name: "Cerrar sesión" });
  await expect(signOut).toBeFocused();
  await expect(signOut).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login/);
});

// Moves the focus with Tab until it reaches the element.
async function tabTo(page: Page, target: ReturnType<Page["locator"]>) {
  for (let step = 0; step < 60; step++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

test("add a movement using only the keyboard", async ({ page }) => {
  await signInThroughForm(page, userB);
  const account = uniqueName("Teclado");
  await createAccount(page, account);
  await page.goto("/");

  // Open the form from the top bar.
  await tabTo(page, openButton(page));
  await page.keyboard.press("Enter");
  const dialog = movementDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "Cuenta" })).toBeVisible();

  // Type: the radio buttons are chosen with Space.
  await tabTo(page, dialog.getByRole("radio", { name: "Gasto" }));
  await page.keyboard.press("Space");
  await expect(dialog.getByRole("radio", { name: "Gasto" })).toBeChecked();

  // Amount and description are typed.
  await tabTo(page, dialog.getByLabel("Importe"));
  await page.keyboard.type("7,5");
  await tabTo(page, dialog.getByLabel("Descripción"));
  await page.keyboard.type("café");

  // The account is chosen from the list: open it and pick an option.
  const accountList = dialog.getByRole("combobox", {
    name: "Cuenta",
    exact: true,
  });
  await tabTo(page, accountList);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(accountList).not.toContainText("Elige una cuenta");

  // Personal or freelance, then save.
  await tabTo(page, dialog.getByRole("radio", { name: "Personal" }));
  await page.keyboard.press("Space");
  await expect(dialog.getByRole("radio", { name: "Personal" })).toBeChecked();
  await tabTo(page, dialog.getByRole("button", { name: "Guardar" }));
  await expect(dialog.getByRole("button", { name: "Guardar" })).toHaveCSS(
    "outline-style",
    "solid",
  );
  await page.keyboard.press("Enter");

  await expect(page.getByText("Movimiento añadido con éxito")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(openButton(page)).toBeFocused();
});
