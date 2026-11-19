import { describe, expect, it } from "vitest";
import { ACCOUNT_GONE } from "./accounts";
import { CATEGORY_GONE } from "./categories";
import { clientWith, json, recording } from "./fake-client";
import {
  createFixedExpenseWithClient,
  listFixedExpensesWithClient,
} from "./fixed-expenses";

const EXPENSE = {
  name: "Alquiler",
  amountCents: 80000,
  frequency: "monthly" as const,
  accountId: "a1",
  categoryId: null,
};

const foreignKey = (constraint: string) =>
  json(409, {
    code: "23503",
    details: null,
    hint: null,
    message: `insert or update on table "fixed_expenses" violates foreign key constraint "${constraint}"`,
  });

describe("Fixed expenses", () => {
  it("lists only the active ones, by name", async () => {
    const { fetchImpl, requests } = recording(() =>
      json(200, [
        { id: "2", name: "Seguro", amount_cents: 5000, frequency: "annual" },
        {
          id: "1",
          name: "Alquiler",
          amount_cents: 80000,
          frequency: "monthly",
        },
      ]),
    );
    const list = await listFixedExpensesWithClient(clientWith(fetchImpl));
    expect(list.map((item) => item.name)).toEqual(["Alquiler", "Seguro"]);
    expect(requests[0]?.query).toContain("active=eq.true");
  });

  it("saves every column and does not send the owner", async () => {
    const { fetchImpl, requests } = recording(
      () => new Response(null, { status: 201 }),
    );
    const result = await createFixedExpenseWithClient(
      clientWith(fetchImpl),
      EXPENSE,
    );
    expect(result).toEqual({ ok: true });
    expect(requests[0]?.body).toEqual({
      name: "Alquiler",
      amount_cents: 80000,
      frequency: "monthly",
      account_id: "a1",
      category_id: null,
    });
  });

  it.each([
    ["fixed_expenses_account_fkey", ACCOUNT_GONE],
    ["fixed_expenses_category_fkey", CATEGORY_GONE],
  ])("says it is gone when %s fails", async (constraint, message) => {
    const { fetchImpl } = recording(() => foreignKey(constraint));
    expect(
      await createFixedExpenseWithClient(clientWith(fetchImpl), EXPENSE),
    ).toEqual({ ok: false, error: message });
  });

  it("throws on any other error", async () => {
    const { fetchImpl } = recording(() =>
      json(500, { code: "XX000", message: "boom", details: null, hint: null }),
    );
    await expect(
      createFixedExpenseWithClient(clientWith(fetchImpl), EXPENSE),
    ).rejects.toThrow("Could not save the fixed expense");
  });
});
