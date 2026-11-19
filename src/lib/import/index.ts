// Reads a bank statement into a table, whatever its format (work item 005).
// Everything happens in the browser: the file itself is never uploaded, only
// the rows the user confirms afterwards (principle 5, ADR-21).
import Papa from "papaparse";
import {
  gridToTable,
  type Grid,
  type TableData,
} from "@/domain/statement/table";
import { isCfb } from "./cfb";
import { readXls } from "./xls";
import { readXlsx } from "./xlsx";

export const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls,.txt";

function parseCsvGrid(text: string): Promise<Grid> {
  return new Promise((resolve, reject) => {
    // header: false keeps the rows some banks put above the table, so the same
    // detection of the header runs for every format.
    Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: "greedy",
      complete: (result) => resolve(result.data),
      error: (error: Error) => reject(error),
    });
  });
}

export async function parseSpreadsheet(file: File): Promise<TableData> {
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 8));

  // The content is trusted over the extension: banks do mislabel their files.
  if (head[0] === 0x50 && head[1] === 0x4b) {
    return gridToTable(await readXlsx(buffer));
  }
  if (isCfb(head)) {
    return gridToTable(readXls(buffer));
  }
  const text = new TextDecoder("utf-8").decode(buffer);
  return gridToTable(await parseCsvGrid(text));
}
