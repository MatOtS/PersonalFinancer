import { describe, expect, it } from "vitest";
import { parseThemePreference } from "./theme";

describe("parseThemePreference", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    ["LIGHT", "system"],
    ["DARK", "system"],
    [undefined, "system"],
    [" light ", "system"],
    [" dark ", "system"],
    ["verde", "system"],
    ["", "system"],
  ])("for %s returns %s", (value, expected) => {
    expect(parseThemePreference(value)).toBe(expected);
  });
});
