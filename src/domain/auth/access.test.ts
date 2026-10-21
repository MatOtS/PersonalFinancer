import { describe, expect, it } from "vitest";
import { decideAccess } from "./access";

// FR-10, FR-11, FR-13, FR-15: what to do with a request, by page and session.
describe("decideAccess", () => {
  describe("without a session", () => {
    it("lets the sign-in page through", () => {
      expect(
        decideAccess({
          pathname: "/login",
          search: "",
          hasValidSession: false,
        }),
      ).toEqual({ kind: "continue" });
    });

    it("keeps the next page when the sign-in page already carries it", () => {
      expect(
        decideAccess({
          pathname: "/login",
          search: "?next=%2Ffacturas",
          hasValidSession: false,
        }),
      ).toEqual({ kind: "continue" });
    });

    it("sends a protected page to sign in and remembers it", () => {
      expect(
        decideAccess({ pathname: "/", search: "", hasValidSession: false }),
      ).toEqual({ kind: "redirect", to: "/login?next=%2F" });
    });

    it("remembers the query string of the page too", () => {
      expect(
        decideAccess({
          pathname: "/facturas",
          search: "?mes=10&anio=2026",
          hasValidSession: false,
        }),
      ).toEqual({
        kind: "redirect",
        to: "/login?next=%2Ffacturas%3Fmes%3D10%26anio%3D2026",
      });
    });

    // FR-13: an unknown page behaves like a protected one, so the app does not
    // reveal which pages exist.
    it("treats an address that does not exist like a protected page", () => {
      expect(
        decideAccess({
          pathname: "/cualquier-cosa",
          search: "",
          hasValidSession: false,
        }),
      ).toEqual({ kind: "redirect", to: "/login?next=%2Fcualquier-cosa" });
    });
  });

  describe("with a session", () => {
    it("sends the sign-in page to Home", () => {
      expect(
        decideAccess({ pathname: "/login", search: "", hasValidSession: true }),
      ).toEqual({ kind: "redirect", to: "/" });
    });

    it("sends the sign-in page to Home even with a next page", () => {
      expect(
        decideAccess({
          pathname: "/login",
          search: "?next=%2Ffacturas",
          hasValidSession: true,
        }),
      ).toEqual({ kind: "redirect", to: "/" });
    });

    it.each([["/"], ["/facturas"], ["/cualquier-cosa"]])(
      "lets %s through",
      (pathname) => {
        expect(
          decideAccess({ pathname, search: "", hasValidSession: true }),
        ).toEqual({ kind: "continue" });
      },
    );
  });
});
