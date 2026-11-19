import { describe, expect, it } from "vitest";
import { validateClient } from "./clients";

const EMPTY = { name: "", taxId: "", address: "", email: "" };

describe("A client needs a name", () => {
  it("refuses an empty name", () => {
    expect(validateClient({ ...EMPTY, name: "  " })).toEqual({
      errors: { name: "Introduce un nombre" },
    });
  });

  it("accepts exactly 100 characters and refuses 101", () => {
    expect(validateClient({ ...EMPTY, name: "a".repeat(100) })).toHaveProperty(
      "value",
    );
    expect(validateClient({ ...EMPTY, name: "a".repeat(101) })).toEqual({
      errors: { name: "El nombre es demasiado largo (máximo 100 caracteres)" },
    });
  });
});

describe("The fiscal data of a client is optional", () => {
  it("keeps only the name when the rest is empty", () => {
    expect(validateClient({ ...EMPTY, name: " Acme " })).toEqual({
      value: { name: "Acme", taxId: null, address: null, email: null },
    });
  });

  it("cleans the spaces of what is written", () => {
    expect(
      validateClient({
        name: "Acme",
        taxId: " B12345678 ",
        address: " Calle 1 ",
        email: " a@acme.test ",
      }),
    ).toEqual({
      value: {
        name: "Acme",
        taxId: "B12345678",
        address: "Calle 1",
        email: "a@acme.test",
      },
    });
  });

  it("has a limit for each text", () => {
    const result = validateClient({
      name: "Acme",
      taxId: "a".repeat(31),
      address: "a".repeat(201),
      email: "a".repeat(201),
    });
    expect(result).toEqual({
      errors: {
        taxId: "El NIF es demasiado largo (máximo 30 caracteres)",
        address: "La dirección es demasiado larga (máximo 200 caracteres)",
        email: "El email es demasiado largo (máximo 200 caracteres)",
      },
    });
  });
});
