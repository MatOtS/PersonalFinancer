// Editing several movements at once (work items 005 and 011): the user picks
// one field and a value, and it is written in every selected movement. The
// same rules serve the movements about to be imported (in the browser) and the
// saved ones (on the server), so they live here once.
import {
  MISSING_ACCOUNT,
  MISSING_KIND,
  parseDescription,
  parseMovementAmount,
  type MovementKind,
  type WorkKind,
} from "./movements";

export type BulkField =
  | "date"
  | "description"
  | "amount"
  | "kind"
  | "account"
  | "category"
  | "workKind"
  | "isFixed";

export const BULK_FIELDS: { value: BulkField; label: string }[] = [
  { value: "date", label: "Fecha" },
  { value: "description", label: "Descripción" },
  { value: "amount", label: "Importe" },
  { value: "kind", label: "Tipo de movimiento" },
  { value: "account", label: "Cuenta" },
  { value: "category", label: "Categoría" },
  { value: "workKind", label: "Personal o freelance" },
  { value: "isFixed", label: "Movimiento fijo" },
];

export const INVALID_DATE = "Introduce una fecha válida";
export const MISSING_WORK_KIND = "Elige personal o freelance";
export const MISSING_FIXED = "Elige si es fijo";

// What is written. Only the keys that are present change.
export type RowPatch = {
  date?: string;
  description?: string | null;
  amountCents?: number;
  kind?: MovementKind;
  accountId?: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  workKind?: WorkKind;
  isFixed?: boolean;
};

// What the user typed: the field, its value and, for the category, the
// subcategory (both may be empty, which clears them).
export type BulkInput = { field: string; value: string; subcategory: string };

const isRealDate = (text: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
  );
};

export function buildPatch(
  input: BulkInput,
): { patch: RowPatch } | { error: string } {
  const value = input.value.trim();
  switch (input.field) {
    case "date":
      return isRealDate(value)
        ? { patch: { date: value } }
        : { error: INVALID_DATE };
    case "description": {
      const description = parseDescription(input.value);
      return "error" in description
        ? { error: description.error }
        : { patch: { description: description.value } };
    }
    case "amount": {
      const amount = parseMovementAmount(input.value);
      return "error" in amount
        ? { error: amount.error }
        : { patch: { amountCents: amount.cents } };
    }
    case "kind":
      return value === "expense" || value === "income"
        ? { patch: { kind: value } }
        : { error: MISSING_KIND };
    case "account":
      return value === ""
        ? { error: MISSING_ACCOUNT }
        : { patch: { accountId: value } };
    case "category": {
      const subcategory = input.subcategory.trim();
      return {
        patch: {
          categoryId: value === "" ? null : value,
          subcategoryId:
            value === "" || subcategory === "" ? null : subcategory,
        },
      };
    }
    case "workKind":
      return value === "personal" || value === "freelance"
        ? { patch: { workKind: value } }
        : { error: MISSING_WORK_KIND };
    case "isFixed":
      return value === "yes" || value === "no"
        ? { patch: { isFixed: value === "yes" } }
        : { error: MISSING_FIXED };
    default:
      return { error: "Elige el campo que quieres cambiar" };
  }
}

export type PatchableRow = {
  date: string;
  description: string | null;
  amountCents: number;
  kind: MovementKind;
  accountId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  workKind: WorkKind;
  isFixed: boolean;
};

// Writes the patch in a row. A new category without subcategory clears the old
// subcategory: it belonged to the old category.
export function applyPatch<T extends PatchableRow>(row: T, patch: RowPatch): T {
  const next: T = { ...row };
  if (patch.date !== undefined) next.date = patch.date;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.amountCents !== undefined) next.amountCents = patch.amountCents;
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.accountId !== undefined) next.accountId = patch.accountId;
  if (patch.workKind !== undefined) next.workKind = patch.workKind;
  if (patch.isFixed !== undefined) next.isFixed = patch.isFixed;
  if (patch.categoryId !== undefined) {
    next.categoryId = patch.categoryId;
    next.subcategoryId = patch.subcategoryId ?? null;
  } else if (patch.subcategoryId !== undefined) {
    next.subcategoryId = patch.subcategoryId;
  }
  return next;
}
