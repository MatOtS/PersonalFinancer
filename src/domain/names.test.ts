import { describe, expect, it } from "vitest";
import { cleanName, compareNames, nameKey, validateName } from "./names";

const TOO_LONG = "El nombre es demasiado largo (máximo 50 caracteres)";
const EMPTY = "Introduce un nombre";

describe("Spaces around a name are removed", () => {
  it.each([
    ["  Wise  ", "Wise"],
    ["Wise", "Wise"],
    ["\tWise\n", "Wise"],
    // Only the ends are cleaned; spaces inside are the user's.
    ["  Mi  cuenta ", "Mi  cuenta"],
    ["   ", ""],
  ])("cleanName(%j) is %j", (raw, expected) => {
    expect(cleanName(raw)).toBe(expected);
  });
});

describe("An account needs a name", () => {
  it.each([[""], ["   "], ["\t\n"]])("%j is empty", (raw) => {
    expect(validateName(raw)).toBe(EMPTY);
  });

  it("accepts a name of one character", () => {
    expect(validateName("a")).toBeNull();
  });
});

describe("A name has a maximum length", () => {
  it("accepts exactly 50 characters", () => {
    expect(validateName("a".repeat(50))).toBeNull();
  });

  it("rejects 51 characters, the first one over", () => {
    expect(validateName("a".repeat(51))).toBe(TOO_LONG);
  });

  it("does not count the spaces around the name", () => {
    expect(validateName(`  ${"a".repeat(50)}  `)).toBeNull();
    expect(validateName(`  ${"a".repeat(51)}  `)).toBe(TOO_LONG);
  });

  it("counts a letter with an accent as one character", () => {
    expect(validateName("á".repeat(50))).toBeNull();
    expect(validateName("ñ".repeat(51))).toBe(TOO_LONG);
  });
});

describe("Two accounts cannot have the same name (the comparison key)", () => {
  it.each([["BBVA"], ["bbva"], [" BBVA "], ["  bBvA\t"]])(
    "%j has the key of BBVA",
    (name) => {
      expect(nameKey(name)).toBe(nameKey("BBVA"));
    },
  );

  it("ignores accents", () => {
    expect(nameKey("Alimentación")).toBe(nameKey("alimentacion"));
    expect(nameKey("ÁÉÍÓÚ")).toBe(nameKey("aeiou"));
  });

  it("keeps the ñ as a letter of its own", () => {
    expect(nameKey("Año")).not.toBe(nameKey("Ano"));
    expect(nameKey("Ñandú")).toBe(nameKey("ñandu"));
  });

  it("keeps different names different", () => {
    expect(nameKey("BBVA")).not.toBe(nameKey("Santander"));
    expect(nameKey("Mi cuenta")).not.toBe(nameKey("Micuenta"));
  });
});

describe("Lists are ordered alphabetically", () => {
  it("sorts ignoring capitals and accents, with ñ after n", () => {
    const names = ["Zeta", "álamo", "Beta", "ñu", "nube", "alfa"];
    // "álamo" comes before "alfa" because the accent is ignored and then
    // "ala…" sorts before "alf…".
    expect([...names].sort(compareNames)).toEqual([
      "álamo",
      "alfa",
      "Beta",
      "nube",
      "ñu",
      "Zeta",
    ]);
  });

  it("treats names that differ only in capitals as equal", () => {
    expect(compareNames("bbva", "BBVA")).toBe(0);
  });
});
