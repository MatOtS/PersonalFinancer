import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProxyClient } from "./proxy";
import { createClient } from "./server";

// The browser never needs to read the session cookie (the app signs in and out
// through server actions), so it must be HttpOnly: a script injected into the
// page then cannot read it and take the session to another computer.
const jar = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: jar.set }),
}));

const base64Url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

// A sign-in answer from the authentication service, with a token that looks real.
const sessionResponse = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = [
    base64Url({ alg: "HS256", typ: "JWT" }),
    base64Url({ sub: "user-1", email: "a@example.test", exp: expiresAt }),
    "signature",
  ].join(".");
  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: "refresh-token",
      user: {
        id: "user-1",
        aud: "authenticated",
        email: "a@example.test",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};

beforeEach(() => {
  jar.set.mockClear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubGlobal("fetch", async () => sessionResponse());
});

const credentials = { email: "a@example.test", password: "secret" };

describe("session cookie", () => {
  it("is HttpOnly when written from Server Components and Server Actions", async () => {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword(credentials);

    expect(jar.set).toHaveBeenCalled();
    for (const [, , options] of jar.set.mock.calls) {
      expect(options.httpOnly).toBe(true);
    }
  });

  it("is HttpOnly when written from the proxy", async () => {
    const { supabase, applyTo } = createProxyClient(
      new NextRequest("http://localhost:3000/"),
    );
    await supabase.auth.signInWithPassword(credentials);
    const cookies = applyTo(NextResponse.next()).cookies.getAll();

    expect(cookies.length).toBeGreaterThan(0);
    for (const cookie of cookies) {
      expect(cookie.httpOnly).toBe(true);
    }
  });
});
