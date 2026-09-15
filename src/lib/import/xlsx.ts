import { readZip, entryText, type ZipEntries } from "./zip";
import { excelSerialToISO, isDateFormat, type Grid } from "./table";

/** "B7" -> 1 (zero-based column index). */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function parseXml(xml: string): Document {
  if (typeof DOMParser === "undefined") {
    throw new Error("Este navegador no puede leer archivos .xlsx.");
  }
  return new DOMParser().parseFromString(xml, "application/xml");
}

/** Shared strings hold every text cell in the workbook, referenced by index. */
function readSharedStrings(entries: ZipEntries): string[] {
  const xml = entryText(entries, "xl/sharedStrings.xml");
  if (!xml) return [];

  return Array.from(parseXml(xml).getElementsByTagName("si")).map((si) =>
    // A string split into runs (<r><t>) has to be joined back together.
    Array.from(si.getElementsByTagName("t"))
      .map((t) => t.textContent ?? "")
      .join("")
  );
}

/**
 * Cell styles, only for telling a date apart from a plain number: both are
 * stored as the same serial and only the format says which is which.
 */
function readDateStyles(entries: ZipEntries): boolean[] {
  const xml = entryText(entries, "xl/styles.xml");
  if (!xml) return [];
  const doc = parseXml(xml);

  const custom = new Map<number, string>();
  for (const fmt of Array.from(doc.getElementsByTagName("numFmt"))) {
    custom.set(Number(fmt.getAttribute("numFmtId")), fmt.getAttribute("formatCode") ?? "");
  }

  const cellXfs = doc.getElementsByTagName("cellXfs")[0];
  if (!cellXfs) return [];

  return Array.from(cellXfs.getElementsByTagName("xf")).map((xf) => {
    const id = Number(xf.getAttribute("numFmtId") ?? 0);
    return isDateFormat(id, custom.get(id));
  });
}

/** The first sheet in the workbook's own order, not in zip order. */
function firstSheetPath(entries: ZipEntries): string {
  const workbook = entryText(entries, "xl/workbook.xml");
  const rels = entryText(entries, "xl/_rels/workbook.xml.rels");

  if (workbook && rels) {
    const sheet = parseXml(workbook).getElementsByTagName("sheet")[0];
    const id = sheet?.getAttribute("r:id") ?? sheet?.getAttribute("id");
    if (id) {
      const target = Array.from(parseXml(rels).getElementsByTagName("Relationship")).find(
        (r) => r.getAttribute("Id") === id
      )?.getAttribute("Target");
      if (target) {
        const clean = target.replace(/^\/?xl\//, "").replace(/^\//, "");
        if (entries.has(`xl/${clean}`)) return `xl/${clean}`;
      }
    }
  }

  const fallback = [...entries.keys()].filter((k) => k.startsWith("xl/worksheets/sheet")).sort();
  if (fallback.length === 0) throw new Error("El archivo .xlsx no tiene hojas.");
  return fallback[0];
}

/** Reads the first sheet of an .xlsx into a raw grid of strings. */
export async function readXlsx(buffer: ArrayBuffer): Promise<Grid> {
  const entries = await readZip(buffer);
  const strings = readSharedStrings(entries);
  const dateStyles = readDateStyles(entries);

  const xml = entryText(entries, firstSheetPath(entries));
  if (!xml) throw new Error("No se pudo leer la hoja del archivo .xlsx.");

  const grid: Grid = [];

  for (const row of Array.from(parseXml(xml).getElementsByTagName("row"))) {
    const cells: string[] = [];

    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const ref = cell.getAttribute("r");
      const index = ref ? columnIndex(ref) : cells.length;
      const type = cell.getAttribute("t");

      let value = "";
      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
        if (type === "s") {
          value = strings[Number(raw)] ?? "";
        } else if (raw !== "") {
          const styleIndex = Number(cell.getAttribute("s") ?? -1);
          const number = Number(raw);
          value =
            dateStyles[styleIndex] && Number.isFinite(number)
              ? excelSerialToISO(number)
              : raw;
        }
      }

      while (cells.length < index) cells.push("");
      cells[index] = value;
    }

    const rowIndex = Number(row.getAttribute("r") ?? grid.length + 1) - 1;
    while (grid.length < rowIndex) grid.push([]);
    grid[rowIndex] = cells;
  }

  return grid;
}
