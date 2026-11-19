import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import type { ValidMovement } from "@/domain/movements";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";
import { ACCOUNT_GONE } from "./accounts";
import { CATEGORY_GONE, SUBCATEGORY_GONE } from "./categories";
import {
  countMovementsWithClient,
  createMovementWithClient,
} from "./movements";

// Same idea as categories.test.ts: the real Supabase client with a fake
// network, so each answer of the database is reproduced here.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const clientWith = (fetchImpl: typeof fetch) =>
  createClient<Database>("http://localhost:54321", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFetchWithTimeout(1000, fetchImpl) },
  });

const ACCOUNT_ID = "a0000000-0000-0000-0000-000000000001";
const CATEGORY_ID = "c0000000-0000-0000-0000-000000000001";
const SUBCATEGORY_ID = "c0000000-0000-0000-0000-000000000002";

const MOVEMENT: ValidMovement = {
  kind: "expense",
  amountCents: 1250,
  date: "2026-11-18",
  accountId: ACCOUNT_ID,
  workKind: "personal",
  description: "cena anoche",
  categoryId: CATEGORY_ID,
  subcategoryId: SUBCATEGORY_ID,
  isFixed: true,
};

type Request = { method: string; table: string; query: string; body: unknown };

// Answers each table separately and remembers what was asked, in order. `rows`
// is what the reads of each table find; `save` answers the insert.
const network = (
  rows: { accounts?: unknown[]; categories?: unknown[] },
  save: () => Response = () => new Response(null, { status: 201 }),
) => {
  const requests: Request[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const table = url.pathname.split("/").pop() ?? "";
    requests.push({
      method,
      table,
      query: decodeURIComponent(url.search),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (method === "GET" && table === "accounts") {
      return json(200, rows.accounts ?? [{ id: ACCOUNT_ID }]);
    }
    if (method === "GET" && table === "categories") {
      return json(200, rows.categories ?? [{ id: "found" }]);
    }
    return save();
  };
  return { fetchImpl, requests };
};

const saves = (requests: Request[]) =>
  requests.filter((request) => request.method === "POST");

const foreignKeyError = (constraint: string) =>
  json(409, {
    code: "23503",
    details: null,
    hint: null,
    message: `insert or update on table "movements" violates foreign key constraint "${constraint}"`,
  });

describe("Saving a movement", () => {
  it("saves every column of the movement, the amount positive and the type apart", async () => {
    const { fetchImpl, requests } = network({});
    const result = await createMovementWithClient(
      clientWith(fetchImpl),
      MOVEMENT,
    );
    expect(result).toEqual({ ok: true });
    expect(saves(requests)).toEqual([
      expect.objectContaining({
        table: "movements",
        body: {
          kind: "expense",
          amount_cents: 1250,
          date: "2026-11-18",
          description: "cena anoche",
          account_id: ACCOUNT_ID,
          category_id: CATEGORY_ID,
          subcategory_id: SUBCATEGORY_ID,
          work_kind: "personal",
          is_fixed: true,
        },
      }),
    ]);
  });

  it("saves the optional data as null and asks only for what was chosen", async () => {
    const { fetchImpl, requests } = network({});
    const result = await createMovementWithClient(clientWith(fetchImpl), {
      ...MOVEMENT,
      kind: "income",
      amountCents: 0,
      description: null,
      categoryId: null,
      subcategoryId: null,
      isFixed: false,
    });
    expect(result).toEqual({ ok: true });
    expect(requests.map((request) => request.table)).toEqual([
      "accounts",
      "movements",
    ]);
    expect(saves(requests)[0]?.body).toMatchObject({
      kind: "income",
      amount_cents: 0,
      description: null,
      category_id: null,
      subcategory_id: null,
      is_fixed: false,
    });
  });

  it("does not send the owner: the database fills it", async () => {
    const { fetchImpl, requests } = network({});
    await createMovementWithClient(clientWith(fetchImpl), MOVEMENT);
    expect(saves(requests)[0]?.body).not.toHaveProperty("user_id");
  });
});

describe("Saving with an account or a category that no longer exists", () => {
  it("says the account is gone and saves nothing (also the account of another user: no rows)", async () => {
    const { fetchImpl, requests } = network({ accounts: [] });
    const result = await createMovementWithClient(
      clientWith(fetchImpl),
      MOVEMENT,
    );
    expect(result).toEqual({ ok: false, error: ACCOUNT_GONE });
    expect(saves(requests)).toEqual([]);
  });

  it("says the category is gone and saves nothing", async () => {
    const { fetchImpl, requests } = network({ categories: [] });
    const result = await createMovementWithClient(clientWith(fetchImpl), {
      ...MOVEMENT,
      subcategoryId: null,
    });
    expect(result).toEqual({ ok: false, error: CATEGORY_GONE });
    expect(saves(requests)).toEqual([]);
  });

  it("says the subcategory is gone when only it is missing", async () => {
    // The category read finds a row, the subcategory read finds none.
    const requests: Request[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      const query = decodeURIComponent(url.search);
      requests.push({
        method: init?.method ?? "GET",
        table: url.pathname.split("/").pop() ?? "",
        query,
        body: undefined,
      });
      if (url.pathname.endsWith("/accounts")) return json(200, [{ id: "x" }]);
      if (url.pathname.endsWith("/categories")) {
        return json(200, query.includes(SUBCATEGORY_ID) ? [] : [{ id: "x" }]);
      }
      return new Response(null, { status: 201 });
    };
    const result = await createMovementWithClient(
      clientWith(fetchImpl),
      MOVEMENT,
    );
    expect(result).toEqual({ ok: false, error: SUBCATEGORY_GONE });
    expect(saves(requests)).toEqual([]);
  });

  it("refuses a subcategory that comes without its category, as gone", async () => {
    const { fetchImpl, requests } = network({});
    const result = await createMovementWithClient(clientWith(fetchImpl), {
      ...MOVEMENT,
      categoryId: null,
    });
    expect(result).toEqual({ ok: false, error: SUBCATEGORY_GONE });
    expect(requests).toEqual([]);
  });

  it("when several are gone, the account is told first, then the category", async () => {
    const { fetchImpl } = network({ accounts: [], categories: [] });
    const first = await createMovementWithClient(
      clientWith(fetchImpl),
      MOVEMENT,
    );
    expect(first).toEqual({ ok: false, error: ACCOUNT_GONE });

    const second = await createMovementWithClient(
      clientWith(network({ categories: [] }).fetchImpl),
      MOVEMENT,
    );
    expect(second).toEqual({ ok: false, error: CATEGORY_GONE });
  });

  it("the category read refuses a subcategory used as a category", async () => {
    const { fetchImpl, requests } = network({});
    await createMovementWithClient(clientWith(fetchImpl), {
      ...MOVEMENT,
      subcategoryId: null,
    });
    const read = requests.find(
      (request) => request.table === "categories" && request.method === "GET",
    );
    expect(read?.query).toContain("parent_id=is.null");
  });

  it("the subcategory read looks for it inside its category", async () => {
    const { fetchImpl, requests } = network({});
    await createMovementWithClient(clientWith(fetchImpl), MOVEMENT);
    const reads = requests
      .filter(
        (request) => request.table === "categories" && request.method === "GET",
      )
      .map((request) => request.query);
    expect(
      reads.some(
        (query) =>
          query.includes(`id=eq.${SUBCATEGORY_ID}`) &&
          query.includes(`parent_id=eq.${CATEGORY_ID}`),
      ),
    ).toBe(true);
  });

  it.each([
    ["movements_account_fkey", ACCOUNT_GONE],
    ["movements_category_fkey", CATEGORY_GONE],
    ["movements_subcategory_fkey", SUBCATEGORY_GONE],
    ["movements_subcategory_category_fkey", SUBCATEGORY_GONE],
  ])(
    "when %s fails after the reads (deleted in between) it says it is gone",
    async (constraint, message) => {
      const { fetchImpl } = network({}, () => foreignKeyError(constraint));
      const result = await createMovementWithClient(
        clientWith(fetchImpl),
        MOVEMENT,
      );
      expect(result).toEqual({ ok: false, error: message });
    },
  );

  it("throws on any other error, so it is not shown as a foreseen one", async () => {
    const { fetchImpl } = network({}, () =>
      json(500, { code: "XX000", message: "boom", details: null, hint: null }),
    );
    await expect(
      createMovementWithClient(clientWith(fetchImpl), MOVEMENT),
    ).rejects.toThrow("Could not save the movement");
  });
});

describe("The account deletion says how many movements go with it (count)", () => {
  const countNetwork = (contentRange: string) => {
    const requests: Request[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      requests.push({
        method: init?.method ?? "GET",
        table: url.pathname.split("/").pop() ?? "",
        query: decodeURIComponent(url.search),
        body: undefined,
      });
      return new Response(null, {
        status: 200,
        headers: { "content-range": contentRange },
      });
    };
    return { fetchImpl, requests };
  };

  it("gives the number of movements of the account, counted by the database", async () => {
    const { fetchImpl, requests } = countNetwork("*/7");
    expect(
      await countMovementsWithClient(clientWith(fetchImpl), ACCOUNT_ID),
    ).toBe(7);
    expect(requests[0]).toMatchObject({ method: "HEAD", table: "movements" });
    expect(requests[0]?.query).toContain(`account_id=eq.${ACCOUNT_ID}`);
  });

  it("gives 0 when the account has none", async () => {
    const { fetchImpl } = countNetwork("*/0");
    expect(
      await countMovementsWithClient(clientWith(fetchImpl), ACCOUNT_ID),
    ).toBe(0);
  });

  it("throws when the database fails", async () => {
    const fetchImpl: typeof fetch = async () =>
      json(500, { code: "XX000", message: "boom", details: null, hint: null });
    await expect(
      countMovementsWithClient(clientWith(fetchImpl), ACCOUNT_ID),
    ).rejects.toThrow("Could not count the movements");
  });
});
