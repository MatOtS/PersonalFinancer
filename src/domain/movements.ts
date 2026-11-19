// Rules for registering a movement (an expense or an income). The form and the
// server both use them, so each rule lives here and only here. Money is integer
// cents (ADR-06). The amount is always positive: the type says whether it adds
// or subtracts, and whoever calculates applies the sign.

export type MovementKind = "expense" | "income";
export type WorkKind = "personal" | "freelance";

// 999.999.999,99 € in cents.
export const MAX_MOVEMENT_CENTS = 99_999_999_999;
export const MAX_DESCRIPTION_LENGTH = 200;

export const INVALID_AMOUNT = "Introduce un importe válido";
export const EMPTY_AMOUNT = "El importe no puede estar vacío";
export const AMOUNT_TOO_BIG = "El importe es demasiado grande";
export const DESCRIPTION_TOO_LONG = `La descripción es demasiado larga (máximo ${MAX_DESCRIPTION_LENGTH} caracteres)`;
export const MISSING_KIND = "Elige tipo de movimiento";
export const MISSING_ACCOUNT = "Debes elegir una cuenta";

// The same shapes of `parseAmount` (whole part plain or with a dot every three
// digits, optional comma with one or two decimals) but with no minus sign: the
// amount of a movement is never negative.
const AMOUNT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

export type MovementAmount = { cents: number } | { error: string };

// Unlike an opening balance, an empty text is an error and a minus sign is not
// accepted. It is compared as a BigInt so that a huge number is "too big" and
// not rounded. Zero is a valid amount.
export function parseMovementAmount(raw: string): MovementAmount {
  const text = raw.trim();
  if (text === "") return { error: EMPTY_AMOUNT };

  const match = AMOUNT.exec(text);
  if (!match) return { error: INVALID_AMOUNT };

  const [, whole = "0", decimals = ""] = match;
  const cents =
    BigInt(whole.replaceAll(".", "")) * BigInt(100) +
    BigInt(decimals.padEnd(2, "0"));
  if (cents > BigInt(MAX_MOVEMENT_CENTS)) return { error: AMOUNT_TOO_BIG };
  return { cents: Number(cents) };
}

export type ParsedDescription = { value: string | null } | { error: string };

// The description is optional: empty is no description. Spaces around it are
// removed, and the length counts characters (not UTF-16 units) after that.
export function parseDescription(raw: string): ParsedDescription {
  const description = raw.trim();
  if (description === "") return { value: null };
  if ([...description].length > MAX_DESCRIPTION_LENGTH) {
    return { error: DESCRIPTION_TOO_LONG };
  }
  return { value: description };
}

// Today in Madrid as `yyyy-mm-dd` (ADR: dates use Europe/Madrid). Near midnight
// the day in Madrid is not the day in UTC.
export function todayInMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Any real date is accepted, in the past or in the future. A text that is not
// a real date (the browser lets the user clear the field) goes back to today.
export function dateOrToday(raw: string, today: string): string {
  const text = raw.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return today;
  const [, year = "", month = "", day = ""] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  // `Date` moves 31 February to March: a real date comes back unchanged.
  return date.toISOString().slice(0, 10) === text ? text : today;
}

// What the form sends, all as text (the checkbox as a boolean).
export type MovementInput = {
  kind: string;
  amount: string;
  date: string;
  accountId: string;
  workKind: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  isFixed: boolean;
};

export type MovementErrors = {
  kind?: string;
  amount?: string;
  description?: string;
  account?: string;
  // No text: the form only marks the radio buttons in red.
  workKind?: true;
};

export type ValidMovement = {
  kind: MovementKind;
  amountCents: number;
  date: string;
  accountId: string;
  workKind: WorkKind;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  isFixed: boolean;
};

export type MovementCheck =
  { errors: MovementErrors } | { movement: ValidMovement };

const isKind = (value: string): value is MovementKind =>
  value === "expense" || value === "income";
const isWorkKind = (value: string): value is WorkKind =>
  value === "personal" || value === "freelance";

// Checks the whole movement and reports every wrong field at once. The date is
// never wrong (see `dateOrToday`). The server repeats this check because the
// browser can be skipped.
export function validateMovement(
  input: MovementInput,
  today: string,
): MovementCheck {
  const errors: MovementErrors = {};

  if (!isKind(input.kind)) errors.kind = MISSING_KIND;

  const amount = parseMovementAmount(input.amount);
  if ("error" in amount) errors.amount = amount.error;

  const description = parseDescription(input.description);
  if ("error" in description) errors.description = description.error;

  const accountId = input.accountId.trim();
  if (accountId === "") errors.account = MISSING_ACCOUNT;

  if (!isWorkKind(input.workKind)) errors.workKind = true;

  if (
    !isKind(input.kind) ||
    "error" in amount ||
    "error" in description ||
    accountId === "" ||
    !isWorkKind(input.workKind)
  ) {
    return { errors };
  }

  return {
    movement: {
      kind: input.kind,
      amountCents: amount.cents,
      date: dateOrToday(input.date, today),
      accountId,
      workKind: input.workKind,
      description: description.value,
      categoryId: input.categoryId.trim() || null,
      subcategoryId: input.subcategoryId.trim() || null,
      isFixed: input.isFixed,
    },
  };
}
