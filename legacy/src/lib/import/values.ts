/** Turning the text in a cell into the number, date or sign the app stores. */

export function parseAmount(raw: string): number {
  // Handles "1.234,56", "1,234.56" and plain "-42.50" formats.
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/[^\d,.-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  }

  const value = Number(normalized) || 0;
  // Some exports mark outgoings with a trailing "-" or wrap them in brackets.
  const negative = /-\s*$/.test(trimmed) || /^\(.*\)$/.test(trimmed);
  return negative && value > 0 ? -value : value;
}

export function parseDate(raw: string): string {
  const trimmed = raw.trim();

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // yyyy-mm-dd, optionally followed by a time (Wise writes both).
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
}

const INCOMING = ["in", "entrada", "abono", "haber", "credito", "crédito", "ingreso", "deposit"];
const OUTGOING = ["out", "salida", "cargo", "debe", "debito", "débito", "gasto", "withdrawal"];

/**
 * Some exports (Wise, for one) list every amount as positive and put the
 * direction in a separate column. Returns -1, 1, or 0 when the value says
 * nothing, in which case the amount's own sign is kept.
 */
export function parseSign(raw: string): -1 | 0 | 1 {
  const value = raw.trim().toLowerCase();
  if (!value) return 0;
  if (OUTGOING.some((word) => value === word || value.startsWith(word))) return -1;
  if (INCOMING.some((word) => value === word || value.startsWith(word))) return 1;
  return 0;
}

const CURRENCY_HEADERS = ["divisa", "moneda", "currency"];

/** Column names that look like they hold a currency code. */
export function currencyColumns(headers: string[]): string[] {
  return headers.filter((h) => CURRENCY_HEADERS.some((c) => h.toLowerCase().includes(c)));
}

/**
 * Currencies other than the euro found in the file. The app stores plain euro
 * amounts, so the import has to say out loud when a row is not in euros rather
 * than quietly booking a dollar as a euro.
 */
export function foreignCurrencies(
  rows: Record<string, string>[],
  headers: string[]
): string[] {
  const columns = currencyColumns(headers);
  if (columns.length === 0) return [];

  const found = new Set<string>();
  for (const row of rows) {
    for (const column of columns) {
      const value = (row[column] ?? "").trim().toUpperCase();
      if (value && value !== "EUR" && value !== "€" && value.length <= 4) found.add(value);
    }
  }
  return [...found].sort();
}
