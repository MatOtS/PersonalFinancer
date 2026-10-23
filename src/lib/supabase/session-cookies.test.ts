import { describe, expect, it } from "vitest";
import { isSessionCookie } from "./session-cookies";

// Signing out removes the session cookies and nothing else (FR-21).
describe("isSessionCookie", () => {
  it.each([
    ["sb-127-auth-token"],
    ["sb-abcdefghij-auth-token"],
    ["sb-127-auth-token.0"],
    ["sb-127-auth-token.1"],
    ["sb-127-auth-token-code-verifier"],
  ])("recognizes %s as a session cookie", (name) => {
    expect(isSessionCookie(name)).toBe(true);
  });

  it.each([
    ["theme"],
    ["sb-127"],
    ["other-auth-token"],
    ["xsb-127-auth-token"],
  ])("does not touch %s", (name) => {
    expect(isSessionCookie(name)).toBe(false);
  });
});
