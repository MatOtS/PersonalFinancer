import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";
import { signInWithClient } from "./auth";

// These tests use the real Supabase client, but its network is replaced by a
// fake fetch, so each failure the service can produce is reproduced here.
const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const clientWith = (fetchImpl: typeof fetch, timeoutMs = 1000) =>
  createClient("http://localhost:54321", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFetchWithTimeout(timeoutMs, fetchImpl) },
  });

const signInWith = (fetchImpl: typeof fetch, timeoutMs?: number) =>
  signInWithClient(
    clientWith(fetchImpl, timeoutMs),
    "a@example.test",
    "secret",
  );

describe("signInWithClient failures", () => {
  it("maps wrong credentials to invalid_credentials (FR-3)", async () => {
    const result = await signInWith(async () =>
      json(400, {
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    );
    expect(result).toEqual({ ok: false, failure: "invalid_credentials" });
  });

  it("maps any other rejection of the attempt to invalid_credentials", async () => {
    const result = await signInWith(async () =>
      json(422, {
        code: 422,
        error_code: "validation_failed",
        msg: "Unable to validate email address: invalid format",
      }),
    );
    expect(result).toEqual({ ok: false, failure: "invalid_credentials" });
  });

  it("maps too many attempts (429) to rate_limited (FR-4)", async () => {
    const result = await signInWith(async () =>
      json(429, {
        code: 429,
        error_code: "over_request_rate_limit",
        msg: "Request rate limit reached",
      }),
    );
    expect(result).toEqual({ ok: false, failure: "rate_limited" });
  });

  it("maps a network error to unreachable (FR-5)", async () => {
    const result = await signInWith(async () => {
      throw new TypeError("fetch failed");
    });
    expect(result).toEqual({ ok: false, failure: "unreachable" });
  });

  it("maps a server error (5xx) to unreachable", async () => {
    const result = await signInWith(async () =>
      json(500, { code: 500, error_code: "unexpected_failure", msg: "boom" }),
    );
    expect(result).toEqual({ ok: false, failure: "unreachable" });
  });

  it("maps no answer within the time limit to unreachable (FR-5)", async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    const result = await signInWith(hanging, 20);
    expect(result).toEqual({ ok: false, failure: "unreachable" });
  });
});
