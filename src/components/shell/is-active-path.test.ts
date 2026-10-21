import { describe, expect, it } from "vitest";
import { isActivePath } from "./is-active-path";

// FR-25: the sidebar marks the item of the current section as active.
describe("isActivePath", () => {
  it.each([
    ["/", "/", true],
    ["/accounts", "/accounts", true],
    ["/accounts/new", "/accounts", true],
    ["/accounts/", "/accounts", true],
    // Home is the root: it must not be active on every other page.
    ["/accounts", "/", false],
    ["/anything", "/", false],
    // A longer name that only starts with the same letters is another section.
    ["/accounts-old", "/accounts", false],
    ["/", "/accounts", false],
  ])("for %s and item %s returns %s", (pathname, href, expected) => {
    expect(isActivePath(pathname, href)).toBe(expected);
  });
});
