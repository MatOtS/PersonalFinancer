/**
 * The few bits of ZIP needed to open an .xlsx, which is a zip of XML parts.
 *
 * Written by hand instead of pulling in a library: the only spreadsheet package
 * that reads both .xlsx and legacy .xls ships on npm as a version with two open
 * advisories, and the whole point of doing this in the browser is that the
 * bank file never leaves the machine. Inflating is delegated to the platform's
 * own DecompressionStream, so there is no bundled decompressor either.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

export type ZipEntries = Map<string, Uint8Array>;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador no puede descomprimir archivos .xlsx.");
  }

  const stream = new Blob([data as BlobPart]).stream().pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(view: DataView): number {
  // The comment field means the record is not necessarily at the very end.
  const start = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/** Reads every file in the archive into memory, keyed by its path. */
export async function readZip(buffer: ArrayBuffer): Promise<ZipEntries> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) throw new Error("El archivo no es un .xlsx válido.");

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (offset === 0xffffffff) throw new Error("El archivo .xlsx usa ZIP64, no soportado.");

  const decoder = new TextDecoder();
  const entries: ZipEntries = new Map();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;

    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    // The local header repeats the name and extra fields with its own lengths.
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      entries.set(name, raw);
    } else if (method === 8) {
      entries.set(name, await inflateRaw(raw));
    }
    // Any other compression method is skipped; Excel only writes 0 and 8.

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

export function entryText(entries: ZipEntries, path: string): string | null {
  const data = entries.get(path);
  return data ? new TextDecoder().decode(data) : null;
}
