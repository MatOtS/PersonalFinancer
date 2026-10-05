/**
 * Compound File Binary reader — the container Excel 97-2003 (.xls) files use.
 *
 * Only what is needed to pull the "Workbook" stream out: the sector table, the
 * directory, and the mini-stream for small entries.
 */

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;

function isChainEnd(sector: number) {
  return sector >= 0xfffffffa;
}

export function isCfb(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte);
}

export function readCompoundFile(buffer: ArrayBuffer): Map<string, Uint8Array> {
  const bytes = new Uint8Array(buffer);
  if (!isCfb(bytes)) throw new Error("El archivo no es un .xls válido.");

  const view = new DataView(buffer);
  const sectorSize = 1 << view.getUint16(30, true);
  const miniSectorSize = 1 << view.getUint16(32, true);
  const fatCount = view.getUint32(44, true);
  const directoryStart = view.getUint32(48, true);
  const miniCutoff = view.getUint32(56, true);
  const miniFatStart = view.getUint32(60, true);
  const difatStart = view.getUint32(68, true);
  const difatCount = view.getUint32(72, true);

  const sector = (index: number) => {
    const start = 512 + index * sectorSize;
    return bytes.subarray(start, start + sectorSize);
  };

  // The first 109 FAT sector numbers live in the header; the rest hang off the
  // DIFAT chain.
  const fatSectors: number[] = [];
  for (let i = 0; i < 109 && fatSectors.length < fatCount; i++) {
    const id = view.getUint32(76 + i * 4, true);
    if (id !== FREE_SECTOR) fatSectors.push(id);
  }

  let next = difatStart;
  for (let i = 0; i < difatCount && !isChainEnd(next); i++) {
    const data = sector(next);
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let j = 0; j < sectorSize / 4 - 1; j++) {
      const id = dv.getUint32(j * 4, true);
      if (id !== FREE_SECTOR) fatSectors.push(id);
    }
    next = dv.getUint32(sectorSize - 4, true);
  }

  const fat: number[] = [];
  for (const id of fatSectors) {
    const data = sector(id);
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let j = 0; j < sectorSize / 4; j++) fat.push(dv.getUint32(j * 4, true));
  }

  const chain = (start: number) => {
    const out: number[] = [];
    let current = start;
    // The guard stops a corrupt file from looping forever.
    while (!isChainEnd(current) && out.length < fat.length + 1) {
      out.push(current);
      current = fat[current] ?? END_OF_CHAIN;
    }
    return out;
  };

  /** Joins a sector chain and trims it to the stream's real length. */
  const concat = (sectors: number[], size: number) => {
    const out = new Uint8Array(sectors.length * sectorSize);
    sectors.forEach((id, i) => out.set(sector(id), i * sectorSize));
    return out.subarray(0, Math.min(size, out.length));
  };

  const directory = concat(chain(directoryStart), Number.MAX_SAFE_INTEGER);

  interface Entry {
    name: string;
    type: number;
    start: number;
    size: number;
  }

  const entries: Entry[] = [];
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const dv = new DataView(directory.buffer, directory.byteOffset + offset, 128);
    const nameLength = dv.getUint16(64, true);
    let name = "";
    for (let i = 0; i + 1 < Math.max(0, nameLength - 2); i += 2) {
      name += String.fromCharCode(dv.getUint16(i, true));
    }
    entries.push({
      name,
      type: dv.getUint8(66),
      start: dv.getUint32(116, true),
      size: dv.getUint32(120, true),
    });
  }

  const root = entries.find((e) => e.type === 5);
  const miniFat: number[] = [];
  if (root) {
    for (const id of chain(miniFatStart)) {
      const data = sector(id);
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      for (let j = 0; j < sectorSize / 4; j++) miniFat.push(dv.getUint32(j * 4, true));
    }
  }
  const miniStream = root ? concat(chain(root.start), root.size) : new Uint8Array(0);

  const readMini = (start: number, size: number) => {
    const out = new Uint8Array(size);
    let current = start;
    let written = 0;
    while (!isChainEnd(current) && written < size) {
      const from = current * miniSectorSize;
      const slice = miniStream.subarray(from, from + Math.min(miniSectorSize, size - written));
      out.set(slice, written);
      written += slice.length;
      current = miniFat[current] ?? END_OF_CHAIN;
    }
    return out;
  };

  const streams = new Map<string, Uint8Array>();
  for (const entry of entries) {
    if (entry.type !== 2) continue; // 2 = stream, 1 = storage, 5 = root
    streams.set(
      entry.name,
      entry.size < miniCutoff
        ? readMini(entry.start, entry.size)
        : concat(chain(entry.start), entry.size)
    );
  }

  return streams;
}
