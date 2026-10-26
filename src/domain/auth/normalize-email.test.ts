import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalize-email";

// Edge case: an email typed with spaces or capitals is the same email.
describe("normalizeEmail", () => {
  it.each([
    ["a@example.test", "a@example.test"],
    ["  a@example.test", "a@example.test"],
    ["a@example.test  ", "a@example.test"],
    ["A@Example.TEST", "a@example.test"],
    ["  A@Example.TEST \n", "a@example.test"],
    ["", ""],
    ["   ", ""],
  ])("for %j returns %j", (raw, expected) => {
    expect(normalizeEmail(raw)).toBe(expected);
  });
});
