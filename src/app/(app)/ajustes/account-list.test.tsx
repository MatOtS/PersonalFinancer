import { describe, expect, it } from "vitest";
import { deleteAccountText } from "./account-list";

describe("The account deletion says how many movements go with it", () => {
  it("names the account and how many movements go with it", () => {
    expect(deleteAccountText("BBVA", 3)).toEqual({
      title: "¿Eliminar la cuenta?",
      description:
        'Se eliminará la cuenta "BBVA" que contiene 3 movimientos. Esta acción no se puede deshacer.',
    });
  });

  it("uses the singular for one movement", () => {
    expect(deleteAccountText("Wise", 1).description).toBe(
      'Se eliminará la cuenta "Wise" que contiene 1 movimiento. Esta acción no se puede deshacer.',
    );
  });

  it("keeps the confirmation it has today when the account has no movements", () => {
    expect(deleteAccountText("Caja", 0)).toEqual({
      title: "¿Eliminar la cuenta?",
      description: 'Se eliminará "Caja". Esta acción no se puede deshacer.',
    });
  });
});
