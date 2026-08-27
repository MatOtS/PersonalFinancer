import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({ headers: result.meta.fields ?? [], rows: result.data });
      },
      error: reject,
    });
  });
}

export function parseAmount(raw: string): number {
  // Handles "1.234,56", "1,234.56" and plain "-42.50" formats.
  const cleaned = raw.trim().replace(/[^\d,.-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  }

  return Number(normalized) || 0;
}

export function parseDate(raw: string): string {
  const trimmed = raw.trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  // already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
}
