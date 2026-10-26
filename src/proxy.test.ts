import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// The proxy is the first gate of every request. These tests send requests
// without a session cookie: no call to the authentication service is needed,
// so the Supabase URL points to an address where nothing listens.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
});

const request = (path: string) =>
  new NextRequest(`http://localhost:3000${path}`);

const nonceOf = (response: Response) =>
  response.headers
    .get("content-security-policy")
    ?.match(/'nonce-([^']+)'/)?.[1];

describe("proxy without a session", () => {
  // FR-10, FR-13, FR-15: any page except the sign-in page asks to sign in and
  // remembers where the user was going.
  it.each([
    ["/", "%2F"],
    ["/cualquier-cosa", "%2Fcualquier-cosa"],
    ["/facturas?mes=10", "%2Ffacturas%3Fmes%3D10"],
  ])("sends %s to the sign-in page", async (path, next) => {
    const response = await proxy(request(path));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost:3000/login?next=${next}`,
    );
  });

  it("lets the sign-in page through", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  // FR-22: the browser must not keep a copy of a protected page.
  it("marks the answer for a protected page as no-store", async () => {
    const response = await proxy(request("/facturas"));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not mark the sign-in page as no-store", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("cache-control")).toBeNull();
  });
});

// NFR security: the policy from spec 001 is still on every answer, redirects
// included, and each request gets its own nonce.
describe("proxy security policy", () => {
  it.each([["/login"], ["/facturas"]])(
    "sets the policy with a nonce on %s",
    async (path) => {
      const response = await proxy(request(path));
      expect(response.headers.get("content-security-policy")).toContain(
        "frame-ancestors 'none'",
      );
      expect(nonceOf(response)).toBeTruthy();
    },
  );

  it("uses a different nonce on each request", async () => {
    const first = await proxy(request("/login"));
    const second = await proxy(request("/login"));
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it("hands the same nonce to the page that renders next", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(response),
    );
  });
});
