import { expect, test } from "@playwright/test";
import {
  expiredSessionCookie,
  tamperedSessionCookie,
} from "./support/session-cookies";
import { userA } from "./support/users";

// NFR security: every page carries a Content-Security-Policy with a fresh nonce
// and the browser reports no violation.
for (const path of ["/", "/cualquier-cosa"]) {
  test.describe(path, () => {
    test("sends the policy and the other security headers", async ({
      request,
    }) => {
      const response = await request.get(path);
      const csp = response.headers()["content-security-policy"];
      expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(response.headers()["permissions-policy"]).toContain("camera=()");
    });

    test("uses a different nonce on each request", async ({ request }) => {
      const nonceOf = async () => {
        const csp = (await request.get(path)).headers()[
          "content-security-policy"
        ];
        return csp?.match(/'nonce-([^']+)'/)?.[1];
      };
      expect(await nonceOf()).not.toBe(await nonceOf());
    });

    test("the browser reports no policy violation", async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (message) => {
        if (/content security policy/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(violations).toEqual([]);
    });
  });
}

const signedOut = { cookies: [], origins: [] };

// NFR security: the server never trusts the cookie it receives. A page asked for
// with no cookie, an edited one or an expired one goes to the sign-in page and
// shows nothing protected (spec 002).
test.describe("protected pages without a valid session", () => {
  test.use({ storageState: signedOut });

  const cases = [
    ["no cookie", () => undefined],
    ["a tampered cookie", tamperedSessionCookie],
    ["an expired cookie", expiredSessionCookie],
  ] as const;

  for (const [label, cookieFor] of cases) {
    for (const path of ["/", "/cualquier-cosa"]) {
      test(`${path} with ${label} goes to the sign-in page`, async ({
        request,
      }) => {
        const cookie = cookieFor();
        const headers = cookie ? { cookie } : undefined;

        // The answer itself is a redirect with nothing protected inside.
        const redirect = await request.get(path, { headers, maxRedirects: 0 });
        expect(redirect.status()).toBe(307);
        expect(redirect.headers()["location"]).toContain("/login");
        const redirectBody = await redirect.text();
        expect(redirectBody).not.toContain("Bienvenido a PersonalFinancer");
        expect(redirectBody).not.toContain(userA.email);

        // And following it ends on the sign-in page.
        const page = await request.get(path, { headers });
        const body = await page.text();
        expect(body).toContain("Iniciar sesión");
        expect(body).not.toContain("Bienvenido a PersonalFinancer");
        expect(body).not.toContain(userA.email);
      });
    }
  }
});

// The sign-in page carries the same policy as the rest of the app, and the
// browser reports no violation in any of its states.
test.describe("sign-in page security policy", () => {
  test.use({ storageState: signedOut });

  test("sends the policy and the other security headers", async ({
    request,
  }) => {
    const response = await request.get("/login");
    const csp = response.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("the browser reports no policy violation in any state", async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/content security policy/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    const signIn = page.getByRole("button", { name: "Iniciar sesión" });

    // Pretend this tab had a session that ended, to see the expired message.
    await page.addInitScript(() => sessionStorage.setItem("hadSession", "1"));
    await page.goto("/login");
    await expect(
      page.getByText("Tu sesión ha terminado. Inicia sesión de nuevo"),
    ).toBeVisible();

    // Field errors.
    await signIn.click();
    await expect(page.getByText("Introduce tu email")).toBeVisible();

    // Waiting for the answer, then the wrong-credentials message.
    await page.route(/\/login$/, async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await route.continue();
    });
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Contraseña").fill("wrong-password");
    await signIn.click();
    await expect(
      page.getByRole("progressbar", { name: "Iniciando sesión" }),
    ).toBeVisible();
    await expect(
      page.getByText("Email o contraseña incorrectos"),
    ).toBeVisible();

    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
});
