import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safe-return-path";

// FR-15, FR-16: after signing in the user goes back to the page they asked
// for, but only if it is a page of this app. Anything else goes to Home.
describe("safeReturnPath", () => {
  it.each([
    ["/", "/"],
    ["/inicio", "/inicio"],
    ["/cuentas/nueva", "/cuentas/nueva"],
    ["/facturas?mes=10", "/facturas?mes=10"],
    [
      "/facturas?mes=10&anio=2026#resumen",
      "/facturas?mes=10&anio=2026#resumen",
    ],
    ["/otro-sitio.com", "/otro-sitio.com"],
    ["/login-ayuda", "/login-ayuda"],
  ])("keeps the internal path %j", (raw, expected) => {
    expect(safeReturnPath(raw)).toBe(expected);
  });

  it.each([
    ["https://evil.com"],
    ["http://evil.com/inicio"],
    ["evil.com"],
    ["inicio"],
    ["javascript:alert(1)"],
    ["//evil.com"],
    ["///evil.com"],
    ["/\\evil.com"],
    ["/\\/evil.com"],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
  ])("sends %j to Home (it could leave the app)", (raw) => {
    expect(safeReturnPath(raw)).toBe("/");
  });

  it.each([["/login"], ["/login?next=/inicio"], ["/login#x"]])(
    "sends the sign-in page %j to Home",
    (raw) => {
      expect(safeReturnPath(raw)).toBe("/");
    },
  );

  it.each([[null], [""], ["   "]])("sends %j to Home", (raw) => {
    expect(safeReturnPath(raw)).toBe("/");
  });
});
