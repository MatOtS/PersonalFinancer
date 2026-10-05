import { readCompoundFile } from "./cfb";
import { excelSerialToISO, isDateFormat, type Grid } from "./table";

/**
 * BIFF8 reader — the record stream inside an Excel 97-2003 file.
 *
 * Deliberately partial: it reads the cell records a bank export actually
 * contains (shared strings, numbers, RK-packed numbers, blanks and cached
 * formula results) and ignores everything about styling, charts and macros.
 */

const RECORD = {
  BOF: 0x0809,
  EOF: 0x000a,
  SST: 0x00fc,
  CONTINUE: 0x003c,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  RSTRING: 0x00d6,
  NUMBER: 0x0203,
  RK: 0x027e,
  MULRK: 0x00bd,
  FORMULA: 0x0006,
  STRING: 0x0207,
  XF: 0x00e0,
  FORMAT: 0x041e,
} as const;

const WORKSHEET = 0x0010;

interface BiffRecord {
  id: number;
  data: DataView;
  bytes: Uint8Array;
}

function splitRecords(stream: Uint8Array): BiffRecord[] {
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const records: BiffRecord[] = [];
  let offset = 0;

  while (offset + 4 <= stream.byteLength) {
    const id = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    if (offset + 4 + length > stream.byteLength) break;
    const bytes = stream.subarray(offset + 4, offset + 4 + length);
    records.push({
      id,
      bytes,
      data: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    });
    offset += 4 + length;
  }

  return records;
}

const latin = new TextDecoder("windows-1252");

function decodeWide(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  }
  return out;
}

/**
 * Shared strings, which may run across CONTINUE records. A string split over a
 * boundary repeats its "wide or narrow" flag byte at the start of the next
 * record, which is the whole reason this needs a cursor over several chunks
 * rather than a single concatenated buffer.
 */
function readSharedStrings(records: BiffRecord[], startIndex: number): string[] {
  const chunks: Uint8Array[] = [records[startIndex].bytes];
  for (let i = startIndex + 1; i < records.length; i++) {
    if (records[i].id !== RECORD.CONTINUE) break;
    chunks.push(records[i].bytes);
  }

  let chunk = 0;
  let offset = 0;

  const remaining = () => chunks[chunk].length - offset;
  const advance = () => {
    while (chunk < chunks.length && remaining() <= 0) {
      chunk++;
      offset = 0;
    }
    return chunk < chunks.length;
  };
  const byte = () => chunks[chunk][offset++];
  const uint16 = () => {
    const value = chunks[chunk][offset] | (chunks[chunk][offset + 1] << 8);
    offset += 2;
    return value;
  };
  const uint32 = () => {
    const value = uint16();
    return value + uint16() * 0x10000;
  };
  const skip = (count: number) => {
    let left = count;
    while (left > 0 && advance()) {
      const take = Math.min(left, remaining());
      offset += take;
      left -= take;
    }
  };

  uint32(); // total strings, unused
  const unique = uint32();

  const strings: string[] = [];
  for (let i = 0; i < unique && advance(); i++) {
    const length = uint16();
    let flags = byte();
    const richRuns = flags & 0x08 ? uint16() : 0;
    const extraBytes = flags & 0x04 ? uint32() : 0;

    let text = "";
    let left = length;
    while (left > 0) {
      if (!advance()) break;
      if (remaining() === 0) break;
      const wide = (flags & 0x01) === 1;
      const available = remaining();
      const take = wide ? Math.min(left, Math.floor(available / 2)) : Math.min(left, available);
      const slice = chunks[chunk].subarray(offset, offset + (wide ? take * 2 : take));
      text += wide ? decodeWide(slice) : latin.decode(slice);
      offset += wide ? take * 2 : take;
      left -= take;
      // Crossing into the next record re-declares the encoding for the rest.
      if (left > 0 && remaining() === 0 && chunk + 1 < chunks.length) {
        chunk++;
        offset = 0;
        flags = byte();
      }
    }

    skip(richRuns * 4 + extraBytes);
    strings.push(text);
  }

  return strings;
}

/** An RK value packs a float or a scaled integer into 32 bits. */
function decodeRk(raw: number): number {
  const asInt = raw | 0;
  let value: number;

  if (asInt & 0x02) {
    value = asInt >> 2;
  } else {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, raw & 0xfffffffc, true);
    value = view.getFloat64(0, true);
  }

  return asInt & 0x01 ? value / 100 : value;
}

function readShortString(view: DataView, offset: number): string {
  const length = view.getUint16(offset, true);
  const flags = view.getUint8(offset + 2);
  const start = view.byteOffset + offset + 3;
  const bytes = new Uint8Array(view.buffer, start, (flags & 0x01 ? length * 2 : length));
  return flags & 0x01 ? decodeWide(bytes) : latin.decode(bytes);
}

/** Reads the first worksheet of an .xls into a raw grid of strings. */
export function readXls(buffer: ArrayBuffer): Grid {
  const streams = readCompoundFile(buffer);
  const workbook = streams.get("Workbook") ?? streams.get("Book");
  if (!workbook) throw new Error("El archivo .xls no contiene una hoja de cálculo.");

  const records = splitRecords(workbook);

  // --- Globals: shared strings and the formats that mark a cell as a date ---
  let strings: string[] = [];
  const xfFormats: number[] = [];
  const formatCodes = new Map<number, string>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.id === RECORD.SST) strings = readSharedStrings(records, i);
    else if (record.id === RECORD.XF) xfFormats.push(record.data.getUint16(2, true));
    else if (record.id === RECORD.FORMAT) {
      formatCodes.set(record.data.getUint16(0, true), readShortString(record.data, 2));
    }
  }

  const isDateCell = (xf: number) => {
    const id = xfFormats[xf];
    return id === undefined ? false : isDateFormat(id, formatCodes.get(id));
  };

  const numberToCell = (value: number, xf: number) =>
    isDateCell(xf) && Number.isFinite(value) ? excelSerialToISO(value) : String(value);

  // --- The first worksheet substream ---
  let start = -1;
  for (let i = 0; i < records.length; i++) {
    if (records[i].id === RECORD.BOF && records[i].data.byteLength >= 4) {
      if (records[i].data.getUint16(2, true) === WORKSHEET) {
        start = i;
        break;
      }
    }
  }
  if (start < 0) throw new Error("El archivo .xls no tiene ninguna hoja con datos.");

  const grid: Grid = [];
  const put = (row: number, column: number, value: string) => {
    while (grid.length <= row) grid.push([]);
    const target = grid[row];
    while (target.length < column) target.push("");
    target[column] = value;
  };

  for (let i = start + 1; i < records.length; i++) {
    const { id, data } = records[i];
    if (id === RECORD.EOF) break;

    if (id === RECORD.LABELSST) {
      const row = data.getUint16(0, true);
      const column = data.getUint16(2, true);
      put(row, column, strings[data.getUint32(6, true)] ?? "");
    } else if (id === RECORD.LABEL || id === RECORD.RSTRING) {
      put(data.getUint16(0, true), data.getUint16(2, true), readShortString(data, 6));
    } else if (id === RECORD.NUMBER) {
      const xf = data.getUint16(4, true);
      put(data.getUint16(0, true), data.getUint16(2, true), numberToCell(data.getFloat64(6, true), xf));
    } else if (id === RECORD.RK) {
      const xf = data.getUint16(4, true);
      const value = decodeRk(data.getUint32(6, true));
      put(data.getUint16(0, true), data.getUint16(2, true), numberToCell(value, xf));
    } else if (id === RECORD.MULRK) {
      const row = data.getUint16(0, true);
      const first = data.getUint16(2, true);
      const count = (data.byteLength - 6) / 6;
      for (let c = 0; c < count; c++) {
        const xf = data.getUint16(4 + c * 6, true);
        const value = decodeRk(data.getUint32(6 + c * 6, true));
        put(row, first + c, numberToCell(value, xf));
      }
    } else if (id === RECORD.FORMULA) {
      const row = data.getUint16(0, true);
      const column = data.getUint16(2, true);
      const xf = data.getUint16(4, true);
      // A result of 0xFFFF in the high word means the value is not a number;
      // a string result arrives in the STRING record that follows.
      if (data.getUint16(12, true) === 0xffff) {
        const next = records[i + 1];
        if (data.getUint8(6) === 0 && next?.id === RECORD.STRING) {
          put(row, column, readShortString(next.data, 0));
        }
      } else {
        put(row, column, numberToCell(data.getFloat64(6, true), xf));
      }
    }
  }

  return grid;
}
