import { expect, test } from "@playwright/test";
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
