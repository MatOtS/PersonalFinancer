import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "./sign-in-error";

// FR-3, FR-4, FR-5: exact texts shown to the user, one per kind of failure.
describe("signInErrorMessage", () => {
  it.each([
    ["invalid_credentials", "Email o contraseña incorrectos"],
    ["rate_limited", "Demasiados intentos. Espera unos minutos"],
    ["unreachable", "No hemos podido conectar. Reintenta"],
  ] as const)("for %s returns %j", (failure, message) => {
    expect(signInErrorMessage(failure)).toBe(message);
  });
});
