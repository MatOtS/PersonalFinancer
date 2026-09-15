import Papa from "papaparse";
import { readXlsx } from "./xlsx";
import { readXls } from "./xls";
import { isCfb } from "./cfb";
import { gridToTable, type Grid, type TableData } from "./table";

export type { TableData } from "./table";

export const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls,.txt";

function parseCsvGrid(text: string): Promise<Grid> {
  return new Promise((resolve, reject) => {
    // header:false keeps the preamble rows some banks put above the table, so
    // the same header detection runs for every format.
    Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: "greedy",
      complete: (result) => resolve(result.data),
      error: reject,
    });
  });
}

/**
 * Reads a bank export into a table, whatever its format. Everything happens in
 * the browser: the file itself is never uploaded, only the rows the user
 * confirms afterwards.
 */
export async function parseSpreadsheet(file: File): Promise<TableData> {
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 8));

  // Trust the content over the extension: banks do mislabel their exports.
  if (head[0] === 0x50 && head[1] === 0x4b) {
    return gridToTable(await readXlsx(buffer));
  }

  if (isCfb(head)) {
    return gridToTable(readXls(buffer));
  }

  const text = new TextDecoder("utf-8").decode(buffer);
  return gridToTable(await parseCsvGrid(text));
}

export { parseAmount, parseDate } from "./values";
