import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";
import {
  ACCOUNT_GONE,
  createAccountWithClient,
  deleteAccountWithClient,
  DUPLICATE_ACCOUNT,
  listAccountsWithClient,
  renameAccountWithClient,
  setOpeningBalanceWithClient,
} from "./accounts";

// Same idea as auth.test.ts: the real Supabase client with a fake network, so
// each answer of the database is reproduced here.
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

describe("listAccountsWithClient", () => {
  it("returns the accounts ordered by name, ignoring capitals and accents", async () => {
    const accounts = await listAccountsWithClient(
      clientWith(async () =>
        json(200, [
          { id: "1", name: "wise", opening_balance_cents: 0 },
          { id: "2", name: "Ñandú", opening_balance_cents: 500 },
          { id: "3", name: "Ahorro", opening_balance_cents: 125000 },
          { id: "4", name: "Álvaro", opening_balance_cents: -3500 },
        ]),
      ),
    );
    expect(accounts.map((account) => account.name)).toEqual([
      "Ahorro",
      "Álvaro",
      "Ñandú",
      "wise",
    ]);
  });

  it("gives each account its opening balance in cents", async () => {
    const accounts = await listAccountsWithClient(
      clientWith(async () =>
        json(200, [
          { id: "1", name: "Wise", opening_balance_cents: 500 },
          { id: "2", name: "BBVA", opening_balance_cents: -3500 },
        ]),
      ),
    );
    expect(accounts).toEqual([
      { id: "2", name: "BBVA", openingBalanceCents: -3500 },
      { id: "1", name: "Wise", openingBalanceCents: 500 },
    ]);
  });
});

describe("createAccountWithClient", () => {
  it("saves the cleaned name with its comparison key", async () => {
    let sent: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(null, { status: 201 });
    };

    await createAccountWithClient(clientWith(fetchImpl), {
      name: "  Wise Ñandú ",
      openingBalanceCents: 12500,
    });
    expect(sent).toEqual({
      name: "Wise Ñandú",
      name_key: "wise ñandu",
      opening_balance_cents: 12500,
    });
  });

  it("answers with the duplicate message when the name already exists", async () => {
    const result = await createAccountWithClient(
      clientWith(async () =>
        json(409, {
          code: "23505",
          details: "Key (user_id, name_key)=(1, bbva) already exists.",
          hint: null,
          message:
            'duplicate key value violates unique constraint "accounts_user_id_name_key_key"',
        }),
      ),
      { name: "bbva", openingBalanceCents: 0 },
    );

    expect(result).toEqual({ ok: false, error: DUPLICATE_ACCOUNT });
  });

  it("throws when the database fails for any other reason", async () => {
    await expect(
      createAccountWithClient(
        clientWith(async () =>
          json(500, {
            code: "XX000",
            message: "boom",
            details: null,
            hint: null,
          }),
        ),
        { name: "Wise", openingBalanceCents: 0 },
      ),
    ).rejects.toThrow("Could not save the account");
  });
});

describe("renameAccountWithClient", () => {
  it("saves the cleaned name with its comparison key", async () => {
    let sent: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return json(200, [{ id: "a0000000-0000-0000-0000-000000000001" }]);
    };

    await renameAccountWithClient(
      clientWith(fetchImpl),
      "a0000000-0000-0000-0000-000000000001",
      "  Wise Ñandú ",
    );

    expect(sent).toEqual({ name: "Wise Ñandú", name_key: "wise ñandu" });
  });

  it("answers ok when the account was renamed", async () => {
    const result = await renameAccountWithClient(
      clientWith(async () =>
        json(200, [{ id: "a0000000-0000-0000-0000-000000000001" }]),
      ),
      "a0000000-0000-0000-0000-000000000001",
      "Wise",
    );
    expect(result).toEqual({ ok: true });
  });

  it("answers with the duplicate message when the name already exists", async () => {
    const result = await renameAccountWithClient(
      clientWith(async () =>
        json(409, {
          code: "23505",
          details: "Key (user_id, name_key)=(1, wise) already exists.",
          hint: null,
          message:
            'duplicate key value violates unique constraint "accounts_user_id_name_key_key"',
        }),
      ),
      "a0000000-0000-0000-0000-000000000001",
      "Wise",
    );
    expect(result).toEqual({ ok: false, error: DUPLICATE_ACCOUNT });
  });

  it("answers that the account no longer exists when no row changed", async () => {
    const result = await renameAccountWithClient(
      clientWith(async () => json(200, [])),
      "a0000000-0000-0000-0000-000000000001",
      "Wise",
    );

    expect(result).toEqual({ ok: false, error: ACCOUNT_GONE });
  });
});

describe("setOpeningBalanceWithClient", () => {
  it("sends the new opening balance in cents", async () => {
    let sent: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return json(200, [{ id: "a0000000-0000-0000-0000-000000000001" }]);
    };
    await setOpeningBalanceWithClient(
      clientWith(fetchImpl),
      "a0000000-0000-0000-0000-000000000001",
      1000,
    );

    expect(sent).toEqual({ opening_balance_cents: 1000 });
  });
  it("answers ok when the balance was changed", async () => {
    const result = await setOpeningBalanceWithClient(
      clientWith(async () =>
        json(200, [{ id: "a0000000-0000-0000-0000-000000000001" }]),
      ),
      "a0000000-0000-0000-0000-000000000001",
      1000,
    );
    expect(result).toEqual({ ok: true });
  });
  it("answers that the account no longer exists when no row changed", async () => {
    const result = await setOpeningBalanceWithClient(
      clientWith(async () => json(200, [])),
      "a0000000-0000-0000-0000-000000000001",
      1000,
    );
    expect(result).toEqual({ ok: false, error: ACCOUNT_GONE });
  });
});

describe("deleteAccountWithClient", () => {
  it("answers ok when the account was deleted", async () => {
    const result = await deleteAccountWithClient(
      clientWith(async () =>
        json(200, [{ id: "a0000000-0000-0000-0000-000000000001" }]),
      ),
      "a0000000-0000-0000-0000-000000000001",
    );
    expect(result).toEqual({ ok: true });
  });
  it("answers that the account no longer exists when no row was deleted", async () => {
    const result = await deleteAccountWithClient(
      clientWith(async () => json(200, [])),
      "a0000000-0000-0000-0000-000000000001",
    );
    expect(result).toEqual({ ok: false, error: ACCOUNT_GONE });
  });
});
