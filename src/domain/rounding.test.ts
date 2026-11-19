import { describe, expect, it } from "vitest";
import { divideRoundHalfEven } from "./rounding";

describe("Rounding to the nearest, half to the even", () => {
  it.each([
    [10, 4, 2], // 2,5 goes to 2 (even)
    [14, 4, 4], // 3,5 goes to 4 (even)
    [9, 4, 2], // 2,25 goes down
    [11, 4, 3], // 2,75 goes up
    [8, 4, 2], // exact
    [0, 7, 0],
  ])("%i / %i is %i", (numerator, denominator, expected) => {
    expect(divideRoundHalfEven(numerator, denominator)).toBe(expected);
  });
});
