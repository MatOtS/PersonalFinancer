import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
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
export async function createMovementWithClient(
  supabase: Client,
  movement: ValidMovement,
): Promise<MovementResult> {
  // A subcategory is only valid inside its category.
  if (movement.subcategoryId && !movement.categoryId) {
    return { ok: false, error: SUBCATEGORY_GONE };
  }

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
  if (account.data?.length === 0) return { ok: false, error: ACCOUNT_GONE };
  if (category && category.data?.length === 0) {
    return { ok: false, error: CATEGORY_GONE };
  }
  if (subcategory && subcategory.data?.length === 0) {
    return { ok: false, error: SUBCATEGORY_GONE };
  }

  const { error } = await supabase.from("movements").insert({
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
  // Deleted between the reads and the save: the key that failed tells which.
  if (error?.code === "23503") {
    const message = Object.entries(GONE_BY_CONSTRAINT).find(([constraint]) =>
      error.message.includes(`"${constraint}"`),
    )?.[1];
    if (message) return { ok: false, error: message };
  }
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

export async function createMovement(
  movement: ValidMovement,
): Promise<MovementResult> {
  return createMovementWithClient(await createClient(), movement);
}

export async function countMovements(accountId: string): Promise<number> {
  return countMovementsWithClient(await createClient(), accountId);
}
