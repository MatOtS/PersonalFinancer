import { describe, expect, it } from "vitest";
import {
  dateOrToday,
  parseDescription,
  parseMovementAmount,
  todayInMadrid,
  validateMovement,
  type MovementInput,
} from "./movements";

const INVALID = { error: "Introduce un importe válido" };
const EMPTY = { error: "El importe no puede estar vacío" };
const TOO_BIG = { error: "El importe es demasiado grande" };

describe("The amount must be a valid amount", () => {
  it.each([
    ["1.250,00", 125000],
    ["1250,5", 125050],
    ["1250", 125000],
    ["1.250", 125000],
    ["0,05", 5],
    ["  12,30  ", 1230],
  ])("%j is %i cents", (raw, cents) => {
    expect(parseMovementAmount(raw)).toEqual({ cents });
  });

  it.each([
    ["abc"],
    ["12,345"],
    ["12.5"],
    ["12,"],
    ["1,2,3"],
    ["12 €"],
    ["-5"],
    ["-0"],
    ["- 5"],
    ["+5"],
  ])("%j is refused", (raw) => {
    expect(parseMovementAmount(raw)).toEqual(INVALID);
  });
});

describe("An amount of zero is accepted", () => {
  it.each([["0"], ["0,00"], ["000"]])("%j is zero cents", (raw) => {
    expect(parseMovementAmount(raw)).toEqual({ cents: 0 });
  });
});

describe("The amount has a maximum", () => {
  it("accepts exactly 999.999.999,99", () => {
    expect(parseMovementAmount("999.999.999,99")).toEqual({
      cents: 99_999_999_999,
    });
  });

  it.each([
    ["1.000.000.000"],
    ["1.000.000.000,00"],
    ["999.999.999,995"],
    ["99999999999999999999"],
  ])("%j is too big or invalid, never accepted", (raw) => {
    // Three decimals is invalid before it is big; the others are too big.
    const result = parseMovementAmount(raw);
    expect(result).toEqual(raw.endsWith(",995") ? INVALID : TOO_BIG);
  });
});

describe("A required data is missing (the amount)", () => {
  it.each([[""], ["   "]])("%j says it cannot be empty", (raw) => {
    expect(parseMovementAmount(raw)).toEqual(EMPTY);
  });
});

describe("The description has a maximum length", () => {
  it("accepts exactly 200 characters", () => {
    expect(parseDescription("a".repeat(200))).toEqual({
      value: "a".repeat(200),
    });
  });

  it("refuses 201 characters", () => {
    expect(parseDescription("a".repeat(201))).toEqual({
      error: "La descripción es demasiado larga (máximo 200 caracteres)",
    });
  });

  it("counts characters, not UTF-16 units", () => {
    expect(parseDescription("😀".repeat(200))).toEqual({
      value: "😀".repeat(200),
    });
  });

  it("is optional: empty is no description", () => {
    expect(parseDescription("")).toEqual({ value: null });
    expect(parseDescription("   ")).toEqual({ value: null });
  });
});

describe("Spaces around the description are removed", () => {
  it('saves "  cena anoche  " as "cena anoche"', () => {
    expect(parseDescription("  cena anoche  ")).toEqual({
      value: "cena anoche",
    });
  });

  it("keeps the spaces in the middle", () => {
    expect(parseDescription("cena  anoche")).toEqual({
      value: "cena  anoche",
    });
  });

  it("counts the length after removing the spaces", () => {
    expect(parseDescription(`  ${"a".repeat(200)}  `)).toEqual({
      value: "a".repeat(200),
    });
  });
});

describe("Any date is accepted", () => {
  const today = "2026-11-18";

  it.each([
    ["2026-02-28"],
    ["2099-01-01"],
    ["1990-05-17"],
    ["2024-02-29"],
    [" 2026-03-04 "],
  ])("%j is kept", (raw) => {
    expect(dateOrToday(raw, today)).toBe(raw.trim());
  });
});

describe("The date is never left empty", () => {
  const today = "2026-11-18";

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["2026-02-31"],
    ["2025-02-29"],
    ["18/11/2026"],
  ])("%j goes back to today", (raw) => {
    expect(dateOrToday(raw, today)).toBe(today);
  });
});

describe("The date starts as today", () => {
  it("is the date in Madrid, not in UTC", () => {
    // 23:30 UTC on 17 November is already 18 November in Madrid (UTC+1).
    expect(todayInMadrid(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-18");
  });

  it("follows the summer time change (UTC+2)", () => {
    expect(todayInMadrid(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15");
    expect(todayInMadrid(new Date("2026-07-14T21:30:00Z"))).toBe("2026-07-14");
  });
});

const VALID: MovementInput = {
  kind: "expense",
  amount: "12,50",
  date: "2026-11-18",
  accountId: "a0000000-0000-0000-0000-000000000001",
  workKind: "personal",
  description: "  cena anoche ",
  categoryId: "c0000000-0000-0000-0000-000000000001",
  subcategoryId: "c0000000-0000-0000-0000-000000000002",
  isFixed: true,
};
const TODAY = "2026-11-18";

describe("A required data is missing", () => {
  it("each wrong field gets its own message, personal or freelance only a mark", () => {
    const result = validateMovement(
      { ...VALID, kind: "", amount: "", accountId: "", workKind: "" },
      TODAY,
    );
    expect(result).toEqual({
      errors: {
        kind: "Elige tipo de movimiento",
        amount: "El importe no puede estar vacío",
        account: "Debes elegir una cuenta",
        workKind: true,
      },
    });
  });

  it("refuses a type or a work kind that is not one of the two", () => {
    const result = validateMovement(
      { ...VALID, kind: "refund", workKind: "other" },
      TODAY,
    );
    expect(result).toEqual({
      errors: { kind: "Elige tipo de movimiento", workKind: true },
    });
  });

  it("reports every problem at once: amount and description", () => {
    const result = validateMovement(
      { ...VALID, amount: "abc", description: "a".repeat(201) },
      TODAY,
    );
    expect(result).toEqual({
      errors: {
        amount: "Introduce un importe válido",
        description:
          "La descripción es demasiado larga (máximo 200 caracteres)",
      },
    });
  });

  it("never reports the date: it goes back to today", () => {
    const result = validateMovement({ ...VALID, date: "" }, TODAY);
    expect(result).toMatchObject({ movement: { date: TODAY } });
  });
});

describe("Which data is required", () => {
  it("accepts a movement with only the required data", () => {
    const result = validateMovement(
      {
        kind: "income",
        amount: "0",
        date: "2026-11-01",
        accountId: VALID.accountId,
        workKind: "freelance",
        description: "",
        categoryId: "",
        subcategoryId: "",
        isFixed: false,
      },
      TODAY,
    );
    expect(result).toEqual({
      movement: {
        kind: "income",
        amountCents: 0,
        date: "2026-11-01",
        accountId: VALID.accountId,
        workKind: "freelance",
        description: null,
        categoryId: null,
        subcategoryId: null,
        isFixed: false,
      },
    });
  });

  it("gives the cleaned values of a full movement", () => {
    expect(validateMovement(VALID, TODAY)).toEqual({
      movement: {
        kind: "expense",
        amountCents: 1250,
        date: "2026-11-18",
        accountId: VALID.accountId,
        workKind: "personal",
        description: "cena anoche",
        categoryId: VALID.categoryId,
        subcategoryId: VALID.subcategoryId,
        isFixed: true,
      },
    });
  });
});

describe("The fixed mark and personal or freelance are only stored", () => {
  it("the fixed mark is allowed on an expense and on an income", () => {
    for (const kind of ["expense", "income"]) {
      expect(
        validateMovement({ ...VALID, kind, isFixed: true }, TODAY),
      ).toMatchObject({ movement: { kind, isFixed: true } });
    }
  });
});
