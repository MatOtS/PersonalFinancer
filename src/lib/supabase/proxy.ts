import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { AUTH_TIMEOUT_MS, createFetchWithTimeout } from "./fetch-with-timeout";

// Supabase client for src/proxy.ts. When the session is refreshed, the new
// cookies go on the request (so the page rendered next sees them) and on the
// response (so the browser keeps them), with the no-cache headers Supabase asks
// for, so a CDN never serves one user's session to another.
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    global: { fetch: createFetchWithTimeout(AUTH_TIMEOUT_MS) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });
}
