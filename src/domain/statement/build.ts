// From a statement and its columns to the movements about to be imported (work
// item 005). Pure: the rows are what the user reviews before anything is saved.
import type { MovementKind } from "../movements";
import type { Mapping } from "./columns";
import { toEuroCents, type Rate } from "./rate";
import type { TableData } from "./table";
import {
  currencyColumn,
  currencyOf,
  parseSign,
  parseStatementAmount,
  parseStatementDate,
} from "./values";

// A statement goes to the server in groups of this size: one call is limited.
export const MAX_ROWS_PER_CALL = 1000;

export type StatementRow = {
  // The position in the statement: tells the rows apart.
  key: string;
  date: string;
  description: string | null;
  // Always positive and in euros; the type says if it adds or subtracts.
  amountCents: number;
  kind: MovementKind;
  // "EUR", or the code the row was in before converting.
  currency: string;
};

export type BuildResult = {
  rows: StatementRow[];
  // Rows left out: no real date, no amount in it.
  withoutDate: number;
  withoutAmount: number;
  // The currencies other than the euro that the statement has, in order.
  foreignCurrencies: string[];
};

// The currencies other than the euro found in the statement.
export function foreignCurrenciesOf(table: TableData): string[] {
  const column = currencyColumn(table.headers);
  if (!column) return [];
  const found = new Set<string>();
  for (const row of table.rows) {
    const currency = currencyOf(row[column] ?? "");
    if (currency !== "EUR") found.add(currency);
  }
  return [...found].sort();
}

// A negative amount is an expense and any other an income, unless the
// statement has a sign column that says it. A row in another currency is
// converted with the rate of its currency (the caller makes sure there is one).
export function buildRows(
  table: TableData,
  mapping: Mapping,
  rates: Record<string, Rate>,
): BuildResult {
  const currencies = currencyColumn(table.headers);
  const rows: StatementRow[] = [];
  let withoutDate = 0;
  let withoutAmount = 0;

  table.rows.forEach((source, index) => {
    const date = parseStatementDate(source[mapping.date] ?? "");
    if (!date) {
      withoutDate += 1;
      return;
    }
    const signed = parseStatementAmount(source[mapping.amount] ?? "");
    if (signed === null) {
      withoutAmount += 1;
      return;
    }

    const sign = mapping.sign ? parseSign(source[mapping.sign] ?? "") : 0;
    const kind: MovementKind =
      sign === -1
        ? "expense"
        : sign === 1
          ? "income"
          : signed < 0
            ? "expense"
            : "income";

    const currency = currencies ? currencyOf(source[currencies] ?? "") : "EUR";
    const rate = rates[currency];
    const amountCents =
      currency === "EUR" || !rate
        ? Math.abs(signed)
        : toEuroCents(Math.abs(signed), rate);

    const description = (source[mapping.description] ?? "").trim();
    rows.push({
      key: String(index),
      date,
      description: description === "" ? null : description,
      amountCents,
      kind,
      currency,
    });
  });

  return {
    rows,
    withoutDate,
    withoutAmount,
    foreignCurrencies: foreignCurrenciesOf(table),
  };
}

// The rows that are already saved: same day, same text, same amount and same
// type. They are shown as possible duplicates and left out by default.
export function duplicateKeys(
  rows: StatementRow[],
  saved: {
    date: string;
    description: string | null;
    amountCents: number;
    kind: string;
  }[],
): Set<string> {
  const id = (item: {
    date: string;
    description: string | null;
    amountCents: number;
    kind: string;
  }) =>
    `${item.date}|${item.description ?? ""}|${item.amountCents}|${item.kind}`;
  const known = new Set(saved.map(id));
  return new Set(
    rows.filter((row) => known.has(id(row))).map((row) => row.key),
  );
}
