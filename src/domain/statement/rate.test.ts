import { describe, expect, it } from "vitest";
import { otherDirectionText, parseRate, toEuroCents } from "./rate";

const rate = (
  raw: string,
  direction: "euroPerUnit" | "unitPerEuro" = "euroPerUnit",
) => {
  const parsed = parseRate(raw, direction);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.rate;
};

describe("The exchange rate", () => {
  it("is written with a comma and up to six decimals", () => {
    expect(parseRate("0,92", "euroPerUnit")).toEqual({
      rate: { direction: "euroPerUnit", micros: 920000 },
    });
    expect(parseRate("1,087500", "unitPerEuro")).toEqual({
      rate: { direction: "unitPerEuro", micros: 1087500 },
    });
    expect(parseRate("2", "euroPerUnit")).toHaveProperty(
      "rate.micros",
      2000000,
    );
  });

  it.each([
    [""],
    ["  "],
    ["0"],
    ["0,0"],
    ["-1"],
    ["abc"],
    ["0.92"],
    ["1,1234567"],
  ])("%j is refused", (raw) => {
    expect(parseRate(raw, "euroPerUnit")).toEqual({
      error: "Introduce un tipo de cambio válido",
    });
  });
});

describe("Converting to euros", () => {
  it("multiplies when the rate is euros per unit", () => {
    // 100,00 USD at 0,92 € per USD is 92,00 €.
    expect(toEuroCents(10000, rate("0,92"))).toBe(9200);
  });

  it("divides when the rate is units per euro", () => {
    // 108,70 USD at 1,087 USD per € is 100,00 €.
    expect(toEuroCents(10870, rate("1,087", "unitPerEuro"))).toBe(10000);
  });

  it("rounds to the nearest cent and half to the even cent", () => {
    // 0,25 x 3,7 = 0,925 goes to 0,92; 0,35 x 3,7 = 1,295 goes to 1,30 (even).
    expect(toEuroCents(25, rate("3,7"))).toBe(92);
    expect(toEuroCents(35, rate("3,7"))).toBe(130);
  });

  it("does not lose precision with the biggest amount", () => {
    expect(toEuroCents(99_999_999_999, rate("1"))).toBe(99_999_999_999);
  });
});

describe("The other direction is shown", () => {
  it("gives the inverse with four decimals", () => {
    expect(otherDirectionText(rate("0,92"))).toBe("1,0870");
    expect(otherDirectionText(rate("2"))).toBe("0,5000");
  });
});
