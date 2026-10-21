import { expect, test } from "@playwright/test";

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
