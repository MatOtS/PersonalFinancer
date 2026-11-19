// Which column of a statement is the date, the description, the amount and the
// sign (work item 005). The app analyzes the content, not only the names:
// a column is proposed by its name only if what it holds backs the name up
// (in the previous app, by name alone, the column of fees of a bank won over
// the column of the amount). The user confirms or corrects the proposal.
import type { TableData } from "./table";
import { parseStatementAmount, parseStatementDate } from "./values";

export type Mapping = {
  date: string;
  description: string;
  amount: string;
  // Empty when the amount already carries its sign.
  sign: string;
};

export const NO_COLUMN = "";

const HEADER_GUESSES = {
  date: [
    "fecha de operación",
    "fecha operacion",
    "fecha",
    "creada el",
    "date",
    "f. valor",
    "f.valor",
  ],
  description: [
    "concepto",
    "descripcion",
    "descripción",
    "detalle",
    "referencia",
    "description",
    "nota",
  ],
  amount: ["importe", "cantidad de origen", "cantidad", "monto", "amount"],
  sign: [
    "dirección",
    "direccion",
    "direction",
    "tipo de movimiento",
    "debe/haber",
  ],
};

// Columns that read like an amount but are not the amount of the movement: a
// column of fees, or the running balance, would be taken as the amount.
const NOT_AN_AMOUNT = [
  "comisión de",
  "comision de",
  "fee",
  "saldo",
  "balance",
  "disponible",
  "tipo de cambio",
];

const isDate = (value: string) => parseStatementDate(value) !== null;
const isNumeric = (value: string) => {
  if (!/^[-−+(]?[\d.,\s]+\)?-?$/.test(value)) return false;
  const cents = parseStatementAmount(value);
  return cents !== null && cents !== 0;
};

// The share of the non-empty cells of a column that pass a test.
function columnScore(
  rows: Record<string, string>[],
  header: string,
  test: (value: string) => boolean,
) {
  const values = rows
    .map((row) => (row[header] ?? "").trim())
    .filter((v) => v !== "");
  if (values.length === 0) return 0;
  return values.filter(test).length / values.length;
}

function guessColumn(
  table: TableData,
  candidates: string[],
  test: (value: string) => boolean,
  exclude: string[] = [],
) {
  const allowed = table.headers.filter(
    (header) => !exclude.some((word) => header.toLowerCase().includes(word)),
  );
  for (const candidate of candidates) {
    const named = allowed.filter((h) => h.toLowerCase().includes(candidate));
    const usable = named.find((h) => columnScore(table.rows, h, test) >= 0.6);
    if (usable) return usable;
  }
  // Nothing matched by name: any column that clearly holds this kind of value,
  // then the first column with a matching name.
  const byContent = allowed.find(
    (h) => columnScore(table.rows, h, test) >= 0.8,
  );
  if (byContent) return byContent;
  for (const candidate of candidates) {
    const named = allowed.find((h) => h.toLowerCase().includes(candidate));
    if (named) return named;
  }
  // A required field is never left unset: the user would be looking at a
  // column the import is not using.
  return allowed[0] ?? table.headers[0] ?? NO_COLUMN;
}

function guessTextColumn(
  headers: string[],
  candidates: string[],
  fallbackToFirst = true,
) {
  for (const candidate of candidates) {
    const match = headers.find((h) => h.toLowerCase().includes(candidate));
    if (match) return match;
  }
  return fallbackToFirst ? (headers[0] ?? NO_COLUMN) : NO_COLUMN;
}

// The proposal of the app, or the one remembered for the account when its
// columns still exist in this file.
export function proposeMapping(
  table: TableData,
  remembered?: Partial<Mapping> | null,
): Mapping {
  const usable = (column: string | undefined) =>
    column && table.headers.includes(column) ? column : null;
  return {
    date:
      usable(remembered?.date) ??
      guessColumn(table, HEADER_GUESSES.date, isDate),
    description:
      usable(remembered?.description) ??
      guessTextColumn(table.headers, HEADER_GUESSES.description),
    amount:
      usable(remembered?.amount) ??
      guessColumn(table, HEADER_GUESSES.amount, isNumeric, NOT_AN_AMOUNT),
    sign:
      // The sign column may be remembered as "none": that is also an answer.
      (remembered &&
      "sign" in remembered &&
      (remembered.sign === "" || usable(remembered.sign))
        ? remembered.sign
        : null) ?? guessTextColumn(table.headers, HEADER_GUESSES.sign, false),
  };
}
