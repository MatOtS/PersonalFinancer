import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import { AUTH_TIMEOUT_MS, createFetchWithTimeout } from "./fetch-with-timeout";

// Supabase client for Server Components and Server Actions. The session lives
// in cookies, so the client reads and writes them through Next's cookie store.
// Create a new one for each request: never keep it in a variable outside.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    global: { fetch: createFetchWithTimeout(AUTH_TIMEOUT_MS) },
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
