import { describe, expect, it } from "vitest";
import { formatCents, parseAmount } from "./money";

const INVALID = { error: "Introduce un importe válido" };

describe("The opening balance must be a valid amount", () => {
  it.each([
    ["1.250,00", 125000],
    ["1250,5", 125050],
    ["1250", 125000],
    ["1.250", 125000],
    ["1.250.000,99", 125000099],
    ["0,05", 5],
    ["  12,30  ", 1230],
  ])("%j is %i cents", (raw, cents) => {
    expect(parseAmount(raw)).toEqual({ cents });
  });

  it.each([
    ["abc"],
    ["12,345"],
    ["12.5"],
    ["1.25"],
    ["1.2500"],
    ["12,"],
    [",5"],
    ["1,2,3"],
    ["12 €"],
    ["--5"],
    ["- 5"],
    ["1e3"],
  ])("%j is not an amount", (raw) => {
    expect(parseAmount(raw)).toEqual(INVALID);
  });

  it("accepts the biggest amount that JavaScript keeps exact", () => {
    expect(parseAmount("90.071.992.547.409,91")).toEqual({
      cents: Number.MAX_SAFE_INTEGER,
    });
  });

  it("rejects one cent more, and a huge number", () => {
    expect(parseAmount("90.071.992.547.409,92")).toEqual(INVALID);
    expect(parseAmount("99999999999999999999")).toEqual(INVALID);
  });
});

describe("An empty opening balance counts as zero", () => {
  it.each([[""], ["   "], ["\t\n"]])("%j is 0 cents", (raw) => {
    expect(parseAmount(raw)).toEqual({ cents: 0 });
  });

  it("accepts a written zero", () => {
    expect(parseAmount("0")).toEqual({ cents: 0 });
    expect(parseAmount("0,00")).toEqual({ cents: 0 });
  });

  it("never gives minus zero", () => {
    // toEqual tells 0 from -0, so this fails if the sign is kept.
    expect(parseAmount("-0")).toEqual({ cents: 0 });
    expect(parseAmount("-0,00")).toEqual({ cents: 0 });
  });
});

describe("The opening balance can be negative", () => {
  it.each([
    ["-350", -35000],
    ["-350,00", -35000],
    ["-1.250,5", -125050],
    ["-0,01", -1],
  ])("%j is %i cents", (raw, cents) => {
    expect(parseAmount(raw)).toEqual({ cents });
  });
});

describe("Amounts are shown as 1.234,56 €", () => {
  it.each([
    [125000, "1.250,00 €"],
    [-35000, "-350,00 €"],
    [0, "0,00 €"],
    [5, "0,05 €"],
    [-1, "-0,01 €"],
    [99999, "999,99 €"],
    [100000, "1.000,00 €"],
    [123456789, "1.234.567,89 €"],
    [-123456789, "-1.234.567,89 €"],
  ])("%i cents is %j", (cents, shown) => {
    expect(formatCents(cents)).toBe(shown);
  });

  it("shows what parseAmount reads", () => {
    for (const cents of [0, 1, 99, 100, 123456, -123456, 1000000]) {
      expect(parseAmount(formatCents(cents).replace(" €", ""))).toEqual({
        cents,
      });
    }
  });
});
