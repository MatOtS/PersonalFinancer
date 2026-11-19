import { expect, test, type Page } from "@playwright/test";
import { expectNoConsoleErrors, watchConsole } from "./support/console-errors";

// Scenario of spec 004: the form opens from any screen, from a button at the
// top right, in a form of generous size. This file checks the dialog (open,
// close, focus); the form inside it has its own tests.

test.beforeEach(({ page }) => watchConsole(page));
test.afterEach(({ page }) => expectNoConsoleErrors(page));

const button = (page: Page) =>
  page.getByRole("button", { name: "Añadir movimiento" });
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Añadir movimiento" });

for (const path of ["/", "/ajustes"]) {
  test.describe(`on ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("the button is at the top right and opens a form of generous size", async ({
      page,
    }) => {
      const box = await button(page).boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      // Right half and the top of the screen.
      expect(box!.x).toBeGreaterThan(viewport!.width / 2);
      expect(box!.y).toBeLessThan(120);

      await button(page).click();
      await expect(dialog(page)).toBeVisible();
      const size = await dialog(page).boundingBox();
      expect(size!.width).toBeGreaterThanOrEqual(560);
    });

    test("Escape closes it and the focus goes back to the button", async ({
      page,
    }) => {
      await button(page).click();
      await expect(dialog(page)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
      await expect(button(page)).toBeFocused();
    });

    test("the close button closes it and the focus goes back to the button", async ({
      page,
    }) => {
      await button(page).click();
      await dialog(page).getByRole("button", { name: "Cerrar" }).click();
      await expect(dialog(page)).toBeHidden();
      await expect(button(page)).toBeFocused();
    });

    test("a click outside closes it", async ({ page }) => {
      await button(page).click();
      await expect(dialog(page)).toBeVisible();
      await page.mouse.click(5, 5);
      await expect(dialog(page)).toBeHidden();
    });

    test("the focus stays inside while it is open", async ({ page }) => {
      await button(page).click();
      await expect(dialog(page)).toBeVisible();
      for (let step = 0; step < 12; step++) {
        await page.keyboard.press("Tab");
        // The trap passes the focus through invisible guards for an instant, so
        // wait for it to be inside instead of reading it at once.
        await expect
          .poll(() =>
            page.evaluate(() =>
              Boolean(document.activeElement?.closest('[role="dialog"]')),
            ),
          )
          .toBe(true);
      }
    });
  });
}
