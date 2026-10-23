import { describe, expect, it } from "vitest";
import { validateSignIn } from "./validate-sign-in";

// FR-9: each empty field gets its own message; filled fields get none.
describe("validateSignIn", () => {
  it("returns no errors when both fields are filled", () => {
    expect(
      validateSignIn({ email: "a@example.test", password: "secret" }),
    ).toEqual({});
  });

  it.each([[""], ["   "], ["\t "]])(
    "counts the email %j as empty (spaces do not count)",
    (email) => {
      expect(validateSignIn({ email, password: "secret" })).toEqual({
        email: "Introduce tu email",
      });
    },
  );

  it("counts a password with no characters as empty", () => {
    expect(validateSignIn({ email: "a@example.test", password: "" })).toEqual({
      password: "Introduce tu contraseña",
    });
  });

  it("does not count a password of only spaces as empty (it is never trimmed)", () => {
    expect(
      validateSignIn({ email: "a@example.test", password: "   " }),
    ).toEqual({});
  });

  it("reports both fields when both are empty", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: "Introduce tu email",
      password: "Introduce tu contraseña",
    });
  });
});
