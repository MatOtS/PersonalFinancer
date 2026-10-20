import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./security-headers";

// NFR security: the app only runs scripts it serves itself and cannot be
// embedded in another site.
const directive = (policy: string, name: string) =>
  policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));

describe("buildContentSecurityPolicy", () => {
  it("allows scripts and styles only with the given nonce or from the app itself", () => {
    const policy = buildContentSecurityPolicy("abc123", false);
    expect(directive(policy, "script-src")).toContain("'self'");
    expect(directive(policy, "script-src")).toContain("'nonce-abc123'");
    expect(directive(policy, "style-src")).toContain("'self'");
    expect(directive(policy, "style-src")).toContain("'nonce-abc123'");
  });

  it("trusts scripts loaded by trusted scripts through 'strict-dynamic'", () => {
    const policy = buildContentSecurityPolicy("abc123", false);
    expect(directive(policy, "script-src")).toContain("'strict-dynamic'");
  });

  it("never allows inline scripts without a nonce, in any environment", () => {
    for (const isDev of [true, false]) {
      const policy = buildContentSecurityPolicy("abc123", isDev);
      expect(directive(policy, "script-src")).not.toContain("'unsafe-inline'");
    }
  });

  it("allows no 'unsafe-inline' at all in production", () => {
    expect(buildContentSecurityPolicy("abc123", false)).not.toContain(
      "'unsafe-inline'",
    );
  });

  it("allows inline style elements only in development, for Next's dev tools", () => {
    expect(
      directive(buildContentSecurityPolicy("abc123", true), "style-src-elem"),
    ).toBe("style-src-elem 'self' 'unsafe-inline'");
    expect(
      directive(buildContentSecurityPolicy("abc123", false), "style-src-elem"),
    ).toBeUndefined();
  });

  it("allows 'unsafe-eval' only in development", () => {
    expect(buildContentSecurityPolicy("abc123", true)).toContain(
      "'unsafe-eval'",
    );
    expect(buildContentSecurityPolicy("abc123", false)).not.toContain(
      "'unsafe-eval'",
    );
  });

  it("upgrades insecure requests only outside development", () => {
    expect(buildContentSecurityPolicy("abc123", true)).not.toContain(
      "upgrade-insecure-requests",
    );
    expect(buildContentSecurityPolicy("abc123", false)).toContain(
      "upgrade-insecure-requests",
    );
  });

  it("blocks embedding the app in another site, plugins and foreign bases or forms", () => {
    const policy = buildContentSecurityPolicy("abc123", false);
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
    expect(directive(policy, "form-action")).toBe("form-action 'self'");
    expect(directive(policy, "default-src")).toBe("default-src 'self'");
  });

  it("builds a different policy for each nonce", () => {
    expect(buildContentSecurityPolicy("one", false)).not.toBe(
      buildContentSecurityPolicy("two", false),
    );
  });
});
