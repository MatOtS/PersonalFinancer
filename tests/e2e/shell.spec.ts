import { expect, test } from "@playwright/test";

// FR-23 to FR-25, FR-27: Home inside the shell.
test.describe("Home", () => {
  test("shows the shell with a single active item and the welcome empty state", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByRole("link")).toHaveCount(1);
    const home = nav.getByRole("link", { name: "Inicio" });
    await expect(home).toHaveAttribute("aria-current", "page");

    await expect(
      page.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
    await expect(page.getByText("Bienvenido a PersonalFinancer")).toBeVisible();
    await expect(
      page.getByText(
        "Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos.",
      ),
    ).toBeVisible();
  });

  test("shows no money figures (nothing exists yet)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).not.toContainText("€");
  });
});

// FR-14: an unknown address renders the 404 inside the shell.
test.describe("Not found", () => {
  test("answers 404 and keeps the sidebar visible", async ({ page }) => {
    const response = await page.goto("/cualquier-cosa");
    expect(response?.status()).toBe(404);

    // The sidebar is the marker that the 404 is inside the shell.
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
    // No item is active on an unknown address.
    await expect(
      page.getByRole("link", { name: "Inicio", exact: true }).first(),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("the link goes back to Home", async ({ page }) => {
    await page.goto("/otra/ruta/que/no/existe");
    await page.getByRole("link", { name: "Volver a Inicio" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
  });
});

// NFR accessibility: everything works with the keyboard alone.
test("keyboard only: reach the navigation and change the theme", async ({
  page,
}) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Inicio" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Sistema" })).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Claro" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
