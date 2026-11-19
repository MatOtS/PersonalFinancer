// Turning the text of a cell into the amount, the date or the sign the app
// stores (work item 005). Ported from the previous app, but the amount is in
// integer cents (ADR-06) and a text that is not an amount or a date is not
// silently taken as zero or as today: it gives null.
import { divideRoundHalfEvenBig } from "../rounding";

const MAX_DIGITS = 15;

// "1.234,56", "1,234.56", "-42.50", "(42,50)" or "42,50-" in cents, the sign
// kept. Null when the text is not an amount.
export function parseStatementAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Some exports mark outgoings with a trailing "-" or wrap them in brackets.
  const negative =
    /^[-−]/.test(trimmed) || /-\s*$/.test(trimmed) || /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[^\d,.]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  }
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;

  const [, whole = "0", decimals = ""] = match;
  if (whole.length + decimals.length > MAX_DIGITS) return null;
  // Exact: the digits are scaled to cents and rounded half to the even cent.
  const scaled = BigInt(`${whole}${decimals}`) * BigInt(100);
  const cents = Number(
    divideRoundHalfEvenBig(scaled, BigInt(10) ** BigInt(decimals.length)),
  );
  return negative && cents > 0 ? -cents : cents;
}

const isRealDate = (year: string, month: string, day: string) => {
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
  );
};

// dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy or yyyy-mm-dd (with or without a time
// after it) as yyyy-mm-dd. Null when it is not a real date.
export function parseStatementDate(raw: string): string | null {
  const text = raw.trim();
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/.exec(text);
  if (dmy) {
    const [, day = "", month = "", year = ""] = dmy;
    const d = day.padStart(2, "0");
    const m = month.padStart(2, "0");
    return isRealDate(year, m, d) ? `${year}-${m}-${d}` : null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(text);
  if (iso) {
    const [, year = "", month = "", day = ""] = iso;
    return isRealDate(year, month, day) ? `${year}-${month}-${day}` : null;
  }
  return null;
}

const INCOMING = [
  "in",
  "entrada",
  "abono",
  "haber",
  "credito",
  "crédito",
  "ingreso",
  "deposit",
];
const OUTGOING = [
  "out",
  "salida",
  "cargo",
  "debe",
  "debito",
  "débito",
  "gasto",
  "withdrawal",
];

// What a sign column says: -1 an expense, 1 an income, 0 nothing (the sign of
// the amount decides then).
export function parseSign(raw: string): -1 | 0 | 1 {
  const value = raw.trim().toLowerCase();
  if (!value) return 0;
  if (OUTGOING.some((word) => value === word || value.startsWith(word)))
    return -1;
  if (INCOMING.some((word) => value === word || value.startsWith(word)))
    return 1;
  return 0;
}

const CURRENCY_HEADERS = ["divisa", "moneda", "currency"];

// The column that holds the currency, if the statement has one.
export function currencyColumn(headers: string[]): string | null {
  return (
    headers.find((header) =>
      CURRENCY_HEADERS.some((word) => header.toLowerCase().includes(word)),
    ) ?? null
  );
}

// "EUR" for the euro (or no currency), the code in capitals for any other. A
// text that is too long to be a code is not a currency.
export function currencyOf(raw: string): string {
  const value = raw.trim().toUpperCase();
  if (value === "" || value === "EUR" || value === "€" || value.length > 4) {
    return "EUR";
  }
  return value;
}
