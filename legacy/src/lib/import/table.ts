/**
 * A spreadsheet or CSV reduced to the same shape, whatever it came from: a
 * header row plus rows keyed by header name.
 *
 * Every cell is a string. Numbers and dates are stringified by the readers in a
 * canonical form ("-21.78", "2026-09-14") so the mapping step downstream only
 * ever deals with text.
 */
export interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

/** A raw rectangular grid, before deciding which row is the header. */
export type Grid = string[][];

/**
 * Words that mark a header row. Bank exports put a title, the account number
 * and a balance above the actual table, so the header cannot be assumed to be
 * the first row.
 */
const HEADER_WORDS = [
  "fecha",
  "concepto",
  "importe",
  "descripcion",
  "descripción",
  "detalle",
  "saldo",
  "divisa",
  "moneda",
  "movimiento",
  "cantidad",
  "amount",
  "date",
  "description",
  "currency",
  "balance",
  "estado",
  "dirección",
  "direccion",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function headerScore(row: string[]) {
  const filled = row.filter((c) => c.trim() !== "");
  if (filled.length < 2) return 0;
  return filled.filter((c) => HEADER_WORDS.some((w) => normalize(c).includes(w))).length;
}

/**
 * Picks the header row: the first row that reads like a set of column names and
 * has data under it. Falls back to the first non-empty row so a file we do not
 * recognise still reaches the mapping step, where the user can fix it by hand.
 */
export function findHeaderRow(grid: Grid): number {
  let best = -1;
  let bestScore = 0;

  for (let i = 0; i < grid.length; i++) {
    const score = headerScore(grid[i]);
    // Needs at least one row of data below it, otherwise it is a footer.
    const hasBody = grid.slice(i + 1).some((r) => r.some((c) => c.trim() !== ""));
    if (score > bestScore && hasBody) {
      best = i;
      bestScore = score;
    }
  }

  if (best >= 0) return best;
  return grid.findIndex((r) => r.some((c) => c.trim() !== ""));
}

/** Two BBVA columns are both called "Divisa"; keys have to stay distinct. */
function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((name, index) => {
    const base = name.trim() === "" ? `Columna ${index + 1}` : name.trim();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

/**
 * Turns a raw grid into a table: drops the preamble above the header row and
 * the empty columns some exports leave on the left, then keys each row by
 * column name.
 */
export function gridToTable(grid: Grid): TableData {
  const headerIndex = findHeaderRow(grid);
  if (headerIndex < 0) return { headers: [], rows: [] };

  const body = grid.slice(headerIndex + 1);
  const headerRow = grid[headerIndex];

  // Keep only columns that carry a name or any value below it.
  const columns: number[] = [];
  for (let c = 0; c < Math.max(headerRow.length, ...body.map((r) => r.length), 0); c++) {
    const named = (headerRow[c] ?? "").trim() !== "";
    const used = body.some((r) => (r[c] ?? "").trim() !== "");
    if (named || used) columns.push(c);
  }

  const headers = uniqueHeaders(columns.map((c) => headerRow[c] ?? ""));

  const rows = body
    .filter((r) => columns.some((c) => (r[c] ?? "").trim() !== ""))
    .map((r) => {
      const record: Record<string, string> = {};
      columns.forEach((c, index) => {
        record[headers[index]] = (r[c] ?? "").trim();
      });
      return record;
    });

  return { headers, rows };
}

/**
 * Excel stores dates as days since 1899-12-31, with the famous phantom
 * 29/02/1900 that makes everything before March 1900 off by one. Bank exports
 * never reach back that far, so the serial is simply offset from the epoch.
 */
export function excelSerialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Excel's built-in date formats, plus any custom code with d/m/y in it. */
export function isDateFormat(numFmtId: number, code: string | undefined): boolean {
  if (numFmtId >= 14 && numFmtId <= 22) return true;
  if (numFmtId >= 45 && numFmtId <= 47) return true;
  if (!code) return false;
  // Strip the literal text so "dd" inside a quoted word does not count.
  const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
  return /[dmy]/i.test(bare) && !/[€$%]/.test(bare);
}
