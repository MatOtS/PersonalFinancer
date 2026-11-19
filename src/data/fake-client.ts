import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";

// For the tests of the data layer: the real Supabase client with a fake
// network, so each answer of the database is reproduced in the test.
export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const clientWith = (fetchImpl: typeof fetch) =>
  createClient<Database>("http://localhost:54321", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFetchWithTimeout(1000, fetchImpl) },
  });

export type Recorded = {
  method: string;
  table: string;
  query: string;
  body: unknown;
};

// Answers every request with `answer` and remembers what was asked, in order.
export const recording = (
  answer: (request: Recorded) => Response,
): { fetchImpl: typeof fetch; requests: Recorded[] } => {
  const requests: Recorded[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const request: Recorded = {
      method: init?.method ?? "GET",
      table: url.pathname.split("/").pop() ?? "",
      query: decodeURIComponent(url.search),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    requests.push(request);
    return answer(request);
  };
  return { fetchImpl, requests };
};
