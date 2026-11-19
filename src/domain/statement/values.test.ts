import { describe, expect, it } from "vitest";
import {
  currencyColumn,
  currencyOf,
  parseSign,
  parseStatementAmount,
  parseStatementDate,
} from "./values";

describe("Amounts of a statement, in cents", () => {
  it.each([
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["-42.50", -4250],
    ["42,5", 4250],
    ["1234", 123400],
    ["(42,50)", -4250],
    ["42,50-", -4250],
    ["-1.000,00 €", -100000],
    ["€ 12,00", 1200],
    ["0", 0],
    ["0,00", 0],
    ["-0", 0],
  ])("%j is %i", (raw, cents) => {
    expect(parseStatementAmount(raw)).toBe(cents);
  });

  it("rounds more than two decimals to the nearest cent, half to the even", () => {
    expect(parseStatementAmount("0.925")).toBe(92);
    expect(parseStatementAmount("0.935")).toBe(94);
    expect(parseStatementAmount("1.2349")).toBe(123);
  });

  it.each([[""], ["   "], ["abc"], ["-"], ["12,34,56"], ["9".repeat(20)]])(
    "%j is not an amount",
    (raw) => {
      expect(parseStatementAmount(raw)).toBeNull();
    },
  );
});

describe("Dates of a statement", () => {
  it.each([
    ["14/09/2026", "2026-09-14"],
    ["4/9/2026", "2026-09-04"],
    ["14-09-2026", "2026-09-14"],
    ["14.09.2026", "2026-09-14"],
    ["2026-09-14", "2026-09-14"],
    ["2026-09-14 10:30:00", "2026-09-14"],
    ["  14/09/2026 ", "2026-09-14"],
  ])("%j is %s", (raw, iso) => {
    expect(parseStatementDate(raw)).toBe(iso);
  });

  it.each([
    [""],
    ["abc"],
    ["31/02/2026"],
    ["2026-02-30"],
    ["14/13/2026"],
    ["12345"],
  ])("%j is not a real date", (raw) => {
    expect(parseStatementDate(raw)).toBeNull();
  });
});

describe("The sign column", () => {
  it.each([
    ["OUT", -1],
    ["Salida", -1],
    ["cargo", -1],
    ["Débito", -1],
    ["withdrawal", -1],
    ["IN", 1],
    ["Abono", 1],
    ["haber", 1],
    ["Crédito", 1],
    ["deposit", 1],
    ["", 0],
    ["otra cosa", 0],
  ])("%j is %i", (raw, sign) => {
    expect(parseSign(raw)).toBe(sign);
  });
});

describe("Currency", () => {
  it("finds the column that holds it", () => {
    expect(currencyColumn(["Fecha", "Divisa", "Importe"])).toBe("Divisa");
    expect(currencyColumn(["Date", "Currency"])).toBe("Currency");
    expect(currencyColumn(["Fecha", "Importe"])).toBeNull();
  });

  it("the euro, or nothing, is the euro; any other code is another currency", () => {
    expect(currencyOf("EUR")).toBe("EUR");
    expect(currencyOf(" € ")).toBe("EUR");
    expect(currencyOf("")).toBe("EUR");
    expect(currencyOf("usd")).toBe("USD");
    expect(currencyOf("una frase larga")).toBe("EUR");
  });
});
