// Rules for invoices (work item 008): the totals, the percentages, the lines
// and the data of the issuer. The form and the server both use them. Money is
// integer cents (ADR-06) and percentages are basis points (1500 is 15 %).
import { dateOrToday, parseMovementAmount } from "./movements";
import { divideRoundHalfEven } from "./rounding";

export type InvoiceStatus = "draft" | "issued" | "paid";

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  paid: "Cobrada",
};

export const INVALID_PERCENT = "Introduce un porcentaje válido";
export const INVALID_QUANTITY = "Introduce una cantidad válida";
export const MISSING_CLIENT = "Elige un cliente";
export const INVALID_DATE = "Introduce una fecha válida";
export const LINES_NEEDED = "Añade al menos una línea";
export const LINES_WRONG =
  "Revisa las líneas: cada una necesita descripción, cantidad y precio válidos";

// "15", "7,5" or "21,00": from 0 to 100 with up to two decimals.
export function parsePercent(raw: string): { bp: number } | { error: string } {
  const match = /^(\d{1,3})(?:,(\d{1,2}))?$/.exec(raw.trim());
  if (!match) return { error: INVALID_PERCENT };
  const [, whole = "0", decimals = ""] = match;
  const bp = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return bp > 10000 ? { error: INVALID_PERCENT } : { bp };
}

// 750 is "7,5" and 2100 is "21": the text the form shows.
export function percentText(bp: number): string {
  const decimals = String(bp % 100)
    .padStart(2, "0")
    .replace(/0$/, "");
  const whole = Math.floor(bp / 100);
  return decimals === "" || decimals === "0"
    ? String(whole)
    : `${whole},${decimals}`;
}

// "1" or "1,5" units: more than zero, up to two decimals. Hundredths.
export function parseQuantity(
  raw: string,
): { hundredths: number } | { error: string } {
  const match = /^(\d{1,6})(?:,(\d{1,2}))?$/.exec(raw.trim());
  if (!match) return { error: INVALID_QUANTITY };
  const [, whole = "0", decimals = ""] = match;
  const hundredths = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return hundredths === 0 ? { error: INVALID_QUANTITY } : { hundredths };
}

export type ValidLine = {
  description: string;
  quantityHundredths: number;
  unitPriceCents: number;
};

// The amount of a line: quantity times unit price, rounded to the cent.
export function lineTotalCents(line: ValidLine): number {
  return divideRoundHalfEven(
    line.quantityHundredths * line.unitPriceCents,
    100,
  );
}

export type InvoiceTotals = {
  baseCents: number;
  ivaCents: number;
  irpfCents: number;
  totalCents: number;
};

// The base is the sum of the lines; the total adds the IVA and subtracts the
// IRPF. Each tax is rounded to the cent on its own.
export function invoiceTotals(
  lines: ValidLine[],
  irpfBp: number,
  ivaBp: number,
): InvoiceTotals {
  const baseCents = lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
  const ivaCents = divideRoundHalfEven(baseCents * ivaBp, 10000);
  const irpfCents = divideRoundHalfEven(baseCents * irpfBp, 10000);
  return {
    baseCents,
    ivaCents,
    irpfCents,
    totalCents: baseCents + ivaCents - irpfCents,
  };
}

// The issue date plus the days of the payment window, as yyyy-mm-dd.
export function dueDateFrom(issueDate: string, days: number): string {
  const date = new Date(`${issueDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// What the form sends, all as text.
export type LineInput = {
  description: string;
  quantity: string;
  unitPrice: string;
};
export type InvoiceInput = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  irpf: string;
  iva: string;
  lines: LineInput[];
};
export type InvoiceErrors = {
  clientId?: string;
  issueDate?: string;
  dueDate?: string;
  irpf?: string;
  iva?: string;
  lines?: string;
};
export type ValidInvoice = {
  clientId: string;
  issueDate: string;
  dueDate: string | null;
  irpfBp: number;
  ivaBp: number;
  lines: ValidLine[];
};
export type InvoiceCheck =
  { errors: InvoiceErrors } | { invoice: ValidInvoice };

const isEmptyLine = (line: LineInput) =>
  line.description.trim() === "" &&
  line.quantity.trim() === "" &&
  line.unitPrice.trim() === "";

const isRealDate = (text: string) => dateOrToday(text, "") === text.trim();

// A line left completely empty is ignored; a line with something in it must be
// complete. The issue date goes back to `today` when empty; the due date is
// optional.
export function validateInvoice(
  input: InvoiceInput,
  today: string,
): InvoiceCheck {
  const errors: InvoiceErrors = {};
  if (input.clientId.trim() === "") errors.clientId = MISSING_CLIENT;

  const issueDate =
    input.issueDate.trim() === "" ? today : input.issueDate.trim();
  if (!isRealDate(issueDate)) errors.issueDate = INVALID_DATE;
  const dueText = input.dueDate.trim();
  if (dueText !== "" && !isRealDate(dueText)) errors.dueDate = INVALID_DATE;

  const irpf = parsePercent(input.irpf);
  if ("error" in irpf) errors.irpf = irpf.error;
  const iva = parsePercent(input.iva);
  if ("error" in iva) errors.iva = iva.error;

  const lines: ValidLine[] = [];
  let linesWrong = false;
  for (const line of input.lines.filter((item) => !isEmptyLine(item))) {
    const quantity = parseQuantity(line.quantity);
    const price = parseMovementAmount(line.unitPrice);
    const description = line.description.trim();
    if (
      description === "" ||
      [...description].length > 200 ||
      "error" in quantity ||
      "error" in price
    ) {
      linesWrong = true;
      continue;
    }
    lines.push({
      description,
      quantityHundredths: quantity.hundredths,
      unitPriceCents: price.cents,
    });
  }
  if (linesWrong) errors.lines = LINES_WRONG;
  else if (lines.length === 0) errors.lines = LINES_NEEDED;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    invoice: {
      clientId: input.clientId.trim(),
      issueDate,
      dueDate: dueText === "" ? null : dueText,
      irpfBp: "bp" in irpf ? irpf.bp : 0,
      ivaBp: "bp" in iva ? iva.bp : 0,
      lines,
    },
  };
}

// The data of the issuer: all optional, spaces removed, empty is no data.
export type IssuerInput = {
  name: string;
  taxId: string;
  phone: string;
  address: string;
  email: string;
  iban: string;
};
export type IssuerErrors = Partial<Record<keyof IssuerInput, string>>;
export type ValidIssuer = { [K in keyof IssuerInput]: string | null };

const ISSUER_LIMITS: Record<keyof IssuerInput, [string, number, boolean]> = {
  name: ["El nombre", 100, false],
  taxId: ["El NIF", 30, false],
  phone: ["El teléfono", 30, false],
  address: ["La dirección", 200, true],
  email: ["El email", 200, false],
  iban: ["El IBAN", 40, false],
};

export function validateIssuer(
  input: IssuerInput,
): { errors: IssuerErrors } | { issuer: ValidIssuer } {
  const errors: IssuerErrors = {};
  const issuer = {} as ValidIssuer;
  for (const key of Object.keys(ISSUER_LIMITS) as (keyof IssuerInput)[]) {
    const [what, max, feminine] = ISSUER_LIMITS[key];
    const text = input[key].trim();
    if ([...text].length > max) {
      errors[key] =
        `${what} es demasiado ${feminine ? "larga" : "largo"} (máximo ${max} caracteres)`;
    }
    issuer[key] = text === "" ? null : text;
  }
  return Object.keys(errors).length > 0 ? { errors } : { issuer };
}

// The defaults for new invoices and how they are numbered.
export type BillingInput = {
  irpf: string;
  iva: string;
  numberFormat: string;
  numberNext: string;
  dueDays: string;
};
export type BillingErrors = Partial<Record<keyof BillingInput, string>>;
export type ValidBilling = {
  irpfBp: number;
  ivaBp: number;
  numberFormat: string;
  numberNext: number;
  dueDays: number;
};

export const FORMAT_NEEDS_NNN = "El formato debe incluir NNN";
export const FORMAT_TOO_LONG =
  "El formato es demasiado largo (máximo 30 caracteres)";
export const INVALID_NUMBER = "Introduce un número válido";

const wholeNumber = (text: string, min: number, max: number) => {
  if (!/^\d{1,9}$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return value >= min && value <= max ? value : null;
};

export function validateBilling(
  input: BillingInput,
): { errors: BillingErrors } | { billing: ValidBilling } {
  const errors: BillingErrors = {};
  const irpf = parsePercent(input.irpf);
  if ("error" in irpf) errors.irpf = irpf.error;
  const iva = parsePercent(input.iva);
  if ("error" in iva) errors.iva = iva.error;

  const format = input.numberFormat.trim();
  if (!format.includes("NNN")) errors.numberFormat = FORMAT_NEEDS_NNN;
  else if ([...format].length > 30) errors.numberFormat = FORMAT_TOO_LONG;

  const next = wholeNumber(input.numberNext, 1, 999999);
  if (next === null) errors.numberNext = INVALID_NUMBER;
  const days = wholeNumber(input.dueDays, 0, 365);
  if (days === null) errors.dueDays = INVALID_NUMBER;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    billing: {
      irpfBp: "bp" in irpf ? irpf.bp : 0,
      ivaBp: "bp" in iva ? iva.bp : 0,
      numberFormat: format,
      numberNext: next ?? 1,
      dueDays: days ?? 30,
    },
  };
}
