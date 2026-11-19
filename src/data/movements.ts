import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { RowPatch } from "@/domain/bulk-edit";
import type { ValidMovement } from "@/domain/movements";
import { ACCOUNT_GONE } from "./accounts";
import { CATEGORY_GONE, SUBCATEGORY_GONE } from "./categories";

type Client = SupabaseClient<Database>;

export type MovementResult = { ok: true } | { ok: false; error: string };

// Which message each foreign key of `movements` gives when what it points at
// is deleted between the reads and the save.
const GONE_BY_CONSTRAINT: Record<string, string> = {
  movements_account_fkey: ACCOUNT_GONE,
  movements_category_fkey: CATEGORY_GONE,
  movements_subcategory_fkey: SUBCATEGORY_GONE,
  movements_subcategory_category_fkey: SUBCATEGORY_GONE,
};

// Like `signIn` in auth.ts: the function with the client holds the logic and is
// what the tests call; the plain one creates the real client.

// Reads what the movement points at before saving, so the message says which
// one is gone. Zero rows is also what another user's row looks like (RLS). The
// owner is never sent: the database fills `user_id` with the signed-in user.
// Reads what a movement points at, so the message says which one is gone: the
// account first, then the category, then the subcategory. Null when all exist.
async function missingReference(
  supabase: Client,
  movement: Pick<ValidMovement, "accountId" | "categoryId" | "subcategoryId">,
): Promise<string | null> {
  // A subcategory is only valid inside its category.
  if (movement.subcategoryId && !movement.categoryId) return SUBCATEGORY_GONE;

  const [account, category, subcategory] = await Promise.all([
    supabase.from("accounts").select("id").eq("id", movement.accountId),
    movement.categoryId
      ? supabase
          .from("categories")
          .select("id")
          .eq("id", movement.categoryId)
          .is("parent_id", null)
      : null,
    movement.subcategoryId && movement.categoryId
      ? supabase
          .from("categories")
          .select("id")
          .eq("id", movement.subcategoryId)
          .eq("parent_id", movement.categoryId)
      : null,
  ]);
  for (const read of [account, category, subcategory]) {
    if (read?.error) {
      throw new Error(`Could not read the movement data, error: ${read.error}`);
    }
  }
  if (account.data?.length === 0) return ACCOUNT_GONE;
  if (category && category.data?.length === 0) return CATEGORY_GONE;
  if (subcategory && subcategory.data?.length === 0) return SUBCATEGORY_GONE;
  return null;
}

// Which message a foreign key error gives, or null when it is another error.
function goneFromError(error: { code?: string; message: string }) {
  if (error.code !== "23503") return null;
  return (
    Object.entries(GONE_BY_CONSTRAINT).find(([constraint]) =>
      error.message.includes(`"${constraint}"`),
    )?.[1] ?? null
  );
}

const columnsOf = (movement: ValidMovement) => ({
  kind: movement.kind,
  amount_cents: movement.amountCents,
  date: movement.date,
  description: movement.description,
  account_id: movement.accountId,
  category_id: movement.categoryId,
  subcategory_id: movement.subcategoryId,
  work_kind: movement.workKind,
  is_fixed: movement.isFixed,
});

// The owner is never sent: the database fills `user_id` with the signed-in user.
export async function createMovementWithClient(
  supabase: Client,
  movement: ValidMovement,
): Promise<MovementResult> {
  const missing = await missingReference(supabase, movement);
  if (missing) return { ok: false, error: missing };

  const { error } = await supabase
    .from("movements")
    .insert(columnsOf(movement));
  // Deleted between the reads and the save: the key that failed tells which.
  const gone = error ? goneFromError(error) : null;
  if (gone) return { ok: false, error: gone };
  if (error) throw new Error(`Could not save the movement, error: ${error}`);
  return { ok: true };
}

// How many movements an account has, counted by the database, for the
// confirmation of deleting the account.
export async function countMovementsWithClient(
  supabase: Client,
  accountId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("movements")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (error) throw new Error(`Could not count the movements, error: ${error}`);
  return count ?? 0;
}

export const MOVEMENT_GONE = "Este movimiento ya no existe";

export type MovementRecord = {
  id: string;
  kind: "expense" | "income";
  amountCents: number;
  date: string;
  description: string | null;
  accountId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  workKind: "personal" | "freelance";
  isFixed: boolean;
  clientId: string | null;
  source: string;
};

// What a bulk edit may change; only the keys that are present are written.
export type MovementPatch = RowPatch;

const PAGE = 1000;

// The API gives at most 1000 rows per request, so the dashboards read page by
// page until there are no more rows.
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  what: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error)
      throw new Error(`Could not load the ${what}, error: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const asRecord = (
  row: Database["public"]["Tables"]["movements"]["Row"],
): MovementRecord => ({
  id: row.id,
  kind: row.kind === "income" ? "income" : "expense",
  amountCents: row.amount_cents,
  date: row.date,
  description: row.description,
  accountId: row.account_id,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id,
  workKind: row.work_kind === "freelance" ? "freelance" : "personal",
  isFixed: row.is_fixed,
  clientId: row.client_id,
  source: row.source,
});

// The movements of a period (both dates included), the newest first.
export async function listMovementsWithClient(
  supabase: Client,
  period: { from: string; to: string; workKind?: "personal" | "freelance" },
): Promise<MovementRecord[]> {
  const rows = await readAll((from, to) => {
    let query = supabase
      .from("movements")
      .select("*")
      .gte("date", period.from)
      .lte("date", period.to)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id");
    if (period.workKind) query = query.eq("work_kind", period.workKind);
    return query.range(from, to);
  }, "movements");
  return rows.map(asRecord);
}

// Every movement, of any date, only with what a balance needs.
export async function listBalanceMovementsWithClient(
  supabase: Client,
): Promise<
  { accountId: string; kind: "expense" | "income"; amountCents: number }[]
> {
  const rows = await readAll(
    (from, to) =>
      supabase
        .from("movements")
        .select("id, account_id, kind, amount_cents")
        .order("id")
        .range(from, to),
    "movements",
  );
  return rows.map((row) => ({
    accountId: row.account_id,
    kind: row.kind === "income" ? "income" : "expense",
    amountCents: row.amount_cents,
  }));
}

export async function updateMovementWithClient(
  supabase: Client,
  id: string,
  movement: ValidMovement,
): Promise<MovementResult> {
  const missing = await missingReference(supabase, movement);
  if (missing) return { ok: false, error: missing };

  const { data, error } = await supabase
    .from("movements")
    .update(columnsOf(movement))
    .eq("id", id)
    .select("id");
  const gone = error ? goneFromError(error) : null;
  if (gone) return { ok: false, error: gone };
  if (error) throw new Error(`Could not update the movement, error: ${error}`);
  if (data.length === 0) return { ok: false, error: MOVEMENT_GONE };
  return { ok: true };
}

// Changes the same fields in every movement of `ids`. A new category without
// a subcategory clears the old subcategory (it belongs to the old category).
export async function patchMovementsWithClient(
  supabase: Client,
  ids: string[],
  patch: MovementPatch,
): Promise<MovementResult> {
  if (ids.length === 0) return { ok: true };
  const changes: Database["public"]["Tables"]["movements"]["Update"] = {};
  if (patch.kind !== undefined) changes.kind = patch.kind;
  if (patch.amountCents !== undefined) changes.amount_cents = patch.amountCents;
  if (patch.date !== undefined) changes.date = patch.date;
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.accountId !== undefined) changes.account_id = patch.accountId;
  if (patch.workKind !== undefined) changes.work_kind = patch.workKind;
  if (patch.isFixed !== undefined) changes.is_fixed = patch.isFixed;
  if (patch.categoryId !== undefined) {
    changes.category_id = patch.categoryId;
    changes.subcategory_id = patch.subcategoryId ?? null;
  } else if (patch.subcategoryId !== undefined) {
    changes.subcategory_id = patch.subcategoryId;
  }
  if (Object.keys(changes).length === 0) return { ok: true };

  const { error } = await supabase
    .from("movements")
    .update(changes)
    .in("id", ids);
  const gone = error ? goneFromError(error) : null;
  if (gone) return { ok: false, error: gone };
  if (error) throw new Error(`Could not update the movements, error: ${error}`);
  return { ok: true };
}

// Returns how many were deleted (a movement already gone is not an error).
export async function deleteMovementsWithClient(
  supabase: Client,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await supabase
    .from("movements")
    .delete()
    .in("id", ids)
    .select("id");
  if (error) throw new Error(`Could not delete the movements, error: ${error}`);
  return data.length;
}

const CHUNK = 500;

// Saves many movements at once (the import). The references are checked once
// for each different account, category and subcategory used.
export async function createMovementsWithClient(
  supabase: Client,
  movements: ValidMovement[],
  source: "import",
): Promise<MovementResult> {
  const seen = new Set<string>();
  for (const movement of movements) {
    const key = [
      movement.accountId,
      movement.categoryId,
      movement.subcategoryId,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const missing = await missingReference(supabase, movement);
    if (missing) return { ok: false, error: missing };
  }
  for (let start = 0; start < movements.length; start += CHUNK) {
    const { error } = await supabase
      .from("movements")
      .insert(
        movements
          .slice(start, start + CHUNK)
          .map((m) => ({ ...columnsOf(m), source })),
      );
    const gone = error ? goneFromError(error) : null;
    if (gone) return { ok: false, error: gone };
    if (error) throw new Error(`Could not save the movements, error: ${error}`);
  }
  return { ok: true };
}

export async function listMovements(period: {
  from: string;
  to: string;
  workKind?: "personal" | "freelance";
}): Promise<MovementRecord[]> {
  return listMovementsWithClient(await createClient(), period);
}
export async function listBalanceMovements() {
  return listBalanceMovementsWithClient(await createClient());
}
export async function updateMovement(id: string, movement: ValidMovement) {
  return updateMovementWithClient(await createClient(), id, movement);
}
export async function patchMovements(ids: string[], patch: MovementPatch) {
  return patchMovementsWithClient(await createClient(), ids, patch);
}
export async function deleteMovements(ids: string[]) {
  return deleteMovementsWithClient(await createClient(), ids);
}
export async function createMovements(movements: ValidMovement[]) {
  return createMovementsWithClient(await createClient(), movements, "import");
}

export async function createMovement(
  movement: ValidMovement,
): Promise<MovementResult> {
  return createMovementWithClient(await createClient(), movement);
}

export async function countMovements(accountId: string): Promise<number> {
  return countMovementsWithClient(await createClient(), accountId);
}
