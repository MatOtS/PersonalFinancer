import { expect, test } from "@playwright/test";
import { signInThroughForm } from "./support/sign-in";
import { userA, userAStatePath, userB } from "./support/users";

// Browser tests of the access flows of spec 002.
// By default a test starts signed in as userA (auth.setup.ts); the describe
// blocks of the signed-out state say otherwise with test.use. Tests that sign
// out use userB in their own context, so they do not end userA's shared session.

const signedOut = { cookies: [], origins: [] };

test.describe("sign-in page", () => {
  test.use({ storageState: signedOut });

  // FR-1
  test("offers email, password and a button, and no sign-up or recovery", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await expect(page.getByRole("link")).toHaveCount(0);
  });

  // FR-2
  test("signs in and lands on Home", async ({ page }) => {
    await signInThroughForm(page, userA);
    await expect(page).toHaveURL("/");
    const home = page.getByRole("link", { name: "Inicio" });
    await expect(home).toHaveAttribute("aria-current", "page");
  });

  // FR-2, FR-15
  test("returns to the page that was asked for (next)", async ({ page }) => {
    await signInThroughForm(page, userA, "/cualquier-pagina");
    await expect(page).toHaveURL("/cualquier-pagina");
    await expect(
      page.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
  });

  // FR-16
  for (const path of ["https://evil.example", "//evil.example", "/login"]) {
    test.describe(path, () => {
      test("ignores an external next and lands on Home", async ({ page }) => {
        await signInThroughForm(page, userA, path);
        await expect(page).toHaveURL("/");
        const home = page.getByRole("link", { name: "Inicio" });
        await expect(home).toHaveAttribute("aria-current", "page");
      });
    });
  }

  // FR-16, second line of defence: the page already cleans ?next=, so this
  // test changes the hidden field by hand to check that the action cleans it too.
  test("the action ignores a tampered next even if the page did not clean it", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator('input[name="next"]').evaluate((field) => {
      (field as HTMLInputElement).value = "https://evil.example";
    });
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Contraseña").fill(userA.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
  });

  // FR-3, FR-6
  test("shows the same message for a wrong password and an unknown email", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Contraseña").fill("wrongPassword");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(
      page.getByText("Email o contraseña incorrectos"),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(userA.email);
    await expect(page.getByLabel("Contraseña")).toHaveValue("");
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrongemail@gmail.com");
    await page.getByLabel("Contraseña").fill(userA.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(
      page.getByText("Email o contraseña incorrectos"),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("wrongemail@gmail.com");
    await expect(page.getByLabel("Contraseña")).toHaveValue("");
  });

  // FR-9
  test("empty fields: messages, error state, focus, nothing sent", async ({
    page,
  }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText("Introduce tu email")).toBeVisible();
    await expect(page.getByText("Introduce tu contraseña")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Contraseña")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Email")).toBeFocused();
    expect(posts).toEqual([]);
  });

  // FR-7
  test("pending state: disabled button, read-only fields, progress bar", async ({
    page,
  }) => {
    // Hold the sign-in request for a moment so the pending state can be seen.
    await page.route(/\/login$/, async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.continue();
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Contraseña").fill("wrong-password");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(
      page.getByRole("button", { name: "Iniciando sesión…" }),
    ).toBeDisabled();
    await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("progressbar", { name: "Iniciando sesión" }),
    ).toBeVisible();

    // When the answer arrives the form is usable again.
    await expect(
      page.getByText("Email o contraseña incorrectos"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeEnabled();
  });

  // FR-8
  test("password managers can fill it and pasting works", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    await expect(page.getByLabel("Contraseña")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );

    for (const [label, text] of [
      ["Email", "pegado@example.test"],
      ["Contraseña", "contraseña-pegada"],
    ] as const) {
      await page.evaluate(
        (value) => navigator.clipboard.writeText(value),
        text,
      );
      await page.getByLabel(label).focus();
      await page.keyboard.press("ControlOrMeta+V");
      await expect(page.getByLabel(label)).toHaveValue(text);
    }
  });
});

test.describe("without a session", () => {
  test.use({ storageState: signedOut });

  // FR-10, FR-13, FR-15
  for (const [path, next] of [
    ["/", "%2F"],
    ["/facturas?mes=10", "%2Ffacturas%3Fmes%3D10"],
    ["/cualquier-cosa", "%2Fcualquier-cosa"],
  ] as const) {
    test(`${path} goes to the sign-in page and is remembered`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${next}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Tu sesión ha terminado")).toHaveCount(0);
    });
  }

  // FR-12
  test("a form opened before signing in does not start a new session", async ({
    page,
    context,
  }) => {
    // The form is opened while signed out...
    await page.goto("/login");

    // ...then the user signs in from a second tab of the same browser...
    const secondTab = await context.newPage();
    await signInThroughForm(secondTab, userA);

    // ...and the first tab's form is submitted with other credentials.
    await page.getByLabel("Email").fill(userB.email);
    await page.getByLabel("Contraseña").fill(userB.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL("/");
    // Still userA's session: the typed credentials were not used.
    await expect(page.locator("aside").getByText(userA.email)).toBeVisible();
    await expect(page.getByText(userB.email)).toHaveCount(0);
  });
});

test.describe("with a session", () => {
  // FR-11
  test("the sign-in page shows Home", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
  });

  // FR-17
  test("the session survives a new browser context", async ({ browser }) => {
    const { baseURL } = test.info().project.use;
    const newContext = await browser.newContext({
      baseURL,
      storageState: userAStatePath,
    });
    const page = await newContext.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
    await newContext.close();
  });

  // FR-26
  test("the sidebar footer shows the email and the sign-out button", async ({
    page,
  }) => {
    await page.goto("/");
    const email = page.locator("aside").getByText(userA.email);
    await expect(email).toBeVisible();
    await expect(email).toHaveAttribute("title", userA.email);
    await expect(
      page.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeVisible();
  });
});

// Each of these tests signs in as userB in its own context: signing out ends
// that session, and it must not end the shared session of userA.
test.describe("signing out", () => {
  test.use({ storageState: signedOut });

  // FR-19, FR-20
  test("signs out and lands on the sign-in page", async ({ page }) => {
    await signInThroughForm(page, userB);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
    ).toBeVisible();
    // Signing out on purpose is not an expired session: no message.
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Tu sesión ha terminado")).toHaveCount(0);
  });

  // FR-22
  test("the back button does not show a protected page", async ({ page }) => {
    await signInThroughForm(page, userB);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toHaveCount(0);
  });

  // FR-22
  test("protected answers are marked no-store", async ({ page }) => {
    // The dev server replaces Cache-Control on pages with its own value
    // ("no-cache, must-revalidate"), so this only holds in the production build,
    // which is what CI tests (see playwright.config.ts).
    test.skip(!process.env.CI, "checked against the production build in CI");

    await signInThroughForm(page, userB);
    const response = await page.request.get("/");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  // FR-18, FR-10
  test("the other tab shows the expired-session message", async ({
    page: tabA,
    context,
  }) => {
    await signInThroughForm(tabA, userB);

    const tabB = await context.newPage();
    await tabB.goto("/");
    await expect(
      tabB.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeVisible();
    // Wait until tab B has noted that it showed a protected page.
    await expect
      .poll(() => tabB.evaluate(() => sessionStorage.getItem("hadSession")))
      .toBe("1");

    // The user signs out in tab A.
    await tabA.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(tabA).toHaveURL(/\/login/);

    // Tab B finds out on its next navigation.
    await tabB.goto("/");
    await expect(
      tabB.getByText("Tu sesión ha terminado. Inicia sesión de nuevo"),
    ).toBeVisible();

    // Tab A, where the user signed out, shows no message.
    await tabA.waitForLoadState("networkidle");
    await expect(tabA.getByText("Tu sesión ha terminado")).toHaveCount(0);
  });
});
