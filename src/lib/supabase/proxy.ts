import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { AUTH_TIMEOUT_MS, createFetchWithTimeout } from "./fetch-with-timeout";

type Refreshed = {
  cookies: Parameters<SetAllCookies>[0];
  headers: Parameters<SetAllCookies>[1];
};

// Supabase client for src/proxy.ts. When checking the session renews it, the
// new cookies are put on the request right away (so the page rendered next
// sees them, and does not ask for a second renewal) and are kept to be copied
// onto the response with applyTo, once the proxy has built it.
export function createProxyClient(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let refreshed: Refreshed | null = null;

  const supabase = createServerClient(url, publishableKey, {
    global: { fetch: createFetchWithTimeout(AUTH_TIMEOUT_MS) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies, headers) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        refreshed = { cookies, headers };
      },
    },
  });

  // Copies the renewed cookies, and the no-cache headers Supabase asks for
  // (so a CDN never serves one user's session to another), onto the response.
  function applyTo(response: NextResponse): NextResponse {
    if (refreshed) {
      refreshed.cookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
      Object.entries(refreshed.headers).forEach(([key, value]) =>
        response.headers.set(key, value),
      );
    }
    return response;
  }

  return { supabase, applyTo };
}
