import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import { sessionCookieOptions } from "./cookie-options";
import type { Database } from "./database.types";
import { AUTH_TIMEOUT_MS, createFetchWithTimeout } from "./fetch-with-timeout";

// Supabase client for Server Components and Server Actions. The session lives
// in cookies, so the client reads and writes them through Next's cookie store.
// Create a new one for each request: never keep it in a variable outside.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    global: { fetch: createFetchWithTimeout(AUTH_TIMEOUT_MS) },
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // A Server Component cannot write cookies. That is fine: the proxy
          // already refreshes the session on every request and writes them.
        }
      },
    },
  });
}
