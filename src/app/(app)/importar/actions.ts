"use server";

import { revalidatePath } from "next/cache";
import { createAccount, listAccounts, type Account } from "@/data/accounts";
import { saveBankProfile } from "@/data/bank-profiles";
import { createMovements, listMovements } from "@/data/movements";
import { cleanName, validateName } from "@/domain/names";
import { formatCents } from "@/domain/money";
import { todayInMadrid, validateMovement } from "@/domain/movements";
import { MAX_ROWS_PER_CALL } from "@/domain/statement/build";
import type { Mapping } from "@/domain/statement/columns";

// What the browser sends for each movement it is going to import: already
// classified. The server checks every one again (the browser can be skipped).
export type ImportRowInput = {
  date: string;
  description: string | null;
  amountCents: number;
  kind: string;
  accountId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  workKind: string;
  isFixed: boolean;
};

export type ImportAccountResult =
  { ok: true; account: Account } | { ok: false; error: string };

export type ImportResult =
  { ok: true; imported: number } | { ok: false; error: string };

// The same add-account rules of the settings page (name, no repeated name), and
// the account starts with an opening balance of 0: what is imported makes its
// balance.
export async function createImportAccountAction(
  name: string,
): Promise<ImportAccountResult> {
  const error = validateName(name);
  if (error) return { ok: false, error };

  const result = await createAccount({ name, openingBalanceCents: 0 });
  if (!result.ok) return result;
  revalidatePath("/ajustes");

  const created = (await listAccounts()).find(
    (account) => account.name === cleanName(name),
  );
  if (!created) return { ok: false, error: "No se pudo crear la cuenta" };
  return { ok: true, account: created };
}

// The movements already saved in the dates of the statement, to mark the
// possible duplicates.
export async function findSavedMovementsAction(range: {
  from: string;
  to: string;
}) {
  const saved = await listMovements(range);
  return saved.map((movement) => ({
    date: movement.date,
    description: movement.description,
    amountCents: movement.amountCents,
    kind: movement.kind,
  }));
}

// Saves a group of movements and, when asked, remembers the columns of the
// account. A statement goes in several calls (the size of one is limited).
export async function importMovementsAction(
  rows: ImportRowInput[],
  remember: { accountId: string; mapping: Mapping } | null,
): Promise<ImportResult> {
  if (rows.length === 0 || rows.length > MAX_ROWS_PER_CALL) {
    return { ok: false, error: "No hay movimientos que importar" };
  }
  const today = todayInMadrid();
  const valid = [];
  for (const row of rows) {
    const check = validateMovement(
      {
        kind: row.kind,
        amount: formatCents(row.amountCents).replace(/ €$/, ""),
        date: row.date,
        accountId: row.accountId,
        workKind: row.workKind,
        description: row.description ?? "",
        categoryId: row.categoryId ?? "",
        subcategoryId: row.subcategoryId ?? "",
        isFixed: row.isFixed,
      },
      today,
    );
    if ("errors" in check) {
      return { ok: false, error: "Hay movimientos con datos no válidos" };
    }
    valid.push(check.movement);
  }

  const result = await createMovements(valid);
  if (!result.ok) return result;

  if (remember) await saveBankProfile(remember.accountId, remember.mapping);
  revalidatePath("/");
  revalidatePath("/freelance");
  return { ok: true, imported: valid.length };
}
