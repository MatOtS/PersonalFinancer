import { expect, test, type Page } from "@playwright/test";

// The page background is --bg: light-dark(#f5f6f7, #0e1113) in globals.css.
const LIGHT_BG = "rgb(245, 246, 247)";
const DARK_BG = "rgb(14, 17, 19)";

const backgroundOf = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// Next's dev indicator sits over the bottom-left corner, where the theme
// control is, and intercepts clicks. It does not exist in production.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () =>
      document.head.append(style),
    );
  });
});

const choose = (page: Page, label: "Sistema" | "Claro" | "Oscuro") =>
  page.getByText(label, { exact: true }).click();

const themeCookie = async (page: Page) =>
  (await page.context().cookies()).find((cookie) => cookie.name === "theme");

test.describe("theme control", () => {
  test("offers the three options, Sistema selected by default", async ({
    page,
  }) => {
    await page.goto("/");
    const group = page.getByRole("group", { name: "Cambiar tema" });
    await expect(group.getByRole("radio")).toHaveCount(3);
    await expect(group.getByRole("radio", { name: "Sistema" })).toBeChecked();
  });

  test("changes immediately without reloading and writes the cookie", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    expect(await backgroundOf(page)).toBe(LIGHT_BG);

    // A marker that disappears on a full page reload.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });

    await choose(page, "Oscuro");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await backgroundOf(page)).toBe(DARK_BG);
    expect(
      await page.evaluate(
        () => (window as unknown as { __noReload?: boolean }).__noReload,
      ),
    ).toBe(true);
    expect((await themeCookie(page))?.value).toBe("dark");
  });

  test("a reload keeps the choice and the server HTML already carries it", async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await choose(page, "Oscuro");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await backgroundOf(page)).toBe(DARK_BG);
    await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked();

    // Without JavaScript running: the raw server response, so no flash on first paint.
    const cookie = await themeCookie(page);
    const html = await (
      await request.get("/", {
        headers: { cookie: `theme=${cookie?.value}` },
      })
    ).text();
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
  });

  test("choosing Sistema removes the saved choice", async ({ page }) => {
    await page.goto("/");
    await choose(page, "Claro");
    expect((await themeCookie(page))?.value).toBe("light");

    await choose(page, "Sistema");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await themeCookie(page)).toBeUndefined();
  });
});

// FR-29: without a saved choice the page follows the system.
test.describe("Sistema follows the system", () => {
  test("uses the system scheme and follows a change while open", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await backgroundOf(page)).toBe(DARK_BG);

    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => backgroundOf(page)).toBe(LIGHT_BG);
  });

  test("a manual choice wins over the system scheme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await choose(page, "Claro");
    expect(await backgroundOf(page)).toBe(LIGHT_BG);
  });
});

// Edge case: cookies blocked.
test("with cookies blocked the app renders in Sistema without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      get: () => "",
      set: () => {},
    });
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await backgroundOf(page)).toBe(DARK_BG);

  // The choice still applies to this visit even if it cannot be saved.
  await choose(page, "Claro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

// FR-32: the theme comes from the root layout, so every page gets it.
test.describe("theme on every page", () => {
  for (const path of ["/", "/cualquier-cosa"]) {
    test(`applies the saved choice on ${path}`, async ({ page, context }) => {
      await context.addCookies([
        { name: "theme", value: "dark", url: "http://localhost:3000" },
      ]);
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await backgroundOf(page)).toBe(DARK_BG);
    });
  }
});
