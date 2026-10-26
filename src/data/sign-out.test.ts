import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "./auth";

// FR-21: if the authentication service cannot be reached when signing out, the
// session cookies are removed anyway, so nothing protected stays on this browser.
const jar = vi.hoisted(() => ({
  all: [
    { name: "sb-127-auth-token", value: "token" },
    { name: "sb-127-auth-token.0", value: "chunk" },
    { name: "theme", value: "dark" },
  ],
  delete: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => jar.all,
    set: vi.fn(),
    delete: jar.delete,
  }),
}));

beforeEach(() => {
  jar.delete.mockClear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
});

describe("signOut", () => {
  it("removes the session cookies even if the service cannot be reached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });

    await expect(signOut()).resolves.toBeUndefined();

    const removed = jar.delete.mock.calls.map(([name]) => name);
    expect(removed).toContain("sb-127-auth-token");
    expect(removed).toContain("sb-127-auth-token.0");
  });

  it("leaves the other cookies alone", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });

    await signOut();

    expect(jar.delete.mock.calls.map(([name]) => name)).not.toContain("theme");
  });
});
