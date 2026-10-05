import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | undefined;

/**
 * Browser Supabase client, created on first use and reused afterwards.
 *
 * Creating it lazily matters for the build: `createBrowserClient` throws when
 * the env vars are missing, and parts of the app shell are prerendered at build
 * time. Never call this during render — call it inside an event handler or an
 * effect, so a build without env vars still succeeds.
 */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
