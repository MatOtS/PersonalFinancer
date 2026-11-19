import { describe, expect, it } from "vitest";
import {
  dueDateFrom,
  invoiceTotals,
  lineTotalCents,
  parsePercent,
  parseQuantity,
  percentText,
  validateBilling,
  validateInvoice,
  validateIssuer,
  type InvoiceInput,
} from "./invoices";

describe("Percentages", () => {
  it.each([
    ["15", 1500],
    ["7,5", 750],
    ["21,00", 2100],
    ["0", 0],
    ["100", 10000],
  ])("%j is %i basis points", (raw, bp) => {
    expect(parsePercent(raw)).toEqual({ bp });
  });

  it.each([[""], ["abc"], ["101"], ["-5"], ["7.5"], ["7,555"]])(
    "%j is refused",
    (raw) => {
      expect(parsePercent(raw)).toEqual({
        error: "Introduce un porcentaje válido",
      });
    },
  );

  it("is written back the way it is typed", () => {
    expect(percentText(1500)).toBe("15");
    expect(percentText(750)).toBe("7,5");
    expect(percentText(725)).toBe("7,25");
  });
});

describe("Quantities", () => {
  it("accepts whole and decimal quantities, in hundredths", () => {
    expect(parseQuantity("1")).toEqual({ hundredths: 100 });
    expect(parseQuantity("1,5")).toEqual({ hundredths: 150 });
  });
  it.each([[""], ["0"], ["0,00"], ["-1"], ["abc"]])("%j is refused", (raw) => {
    expect(parseQuantity(raw)).toEqual({
      error: "Introduce una cantidad válida",
    });
  });
});

describe("The totals of an invoice", () => {
  const lines = [
    { description: "A", quantityHundredths: 150, unitPriceCents: 10000 },
    { description: "B", quantityHundredths: 100, unitPriceCents: 5000 },
  ];

  it("is the base plus the IVA minus the IRPF", () => {
    // base 150,00 + 50,00 = 200,00; IVA 21 % = 42,00; IRPF 15 % = 30,00.
    expect(invoiceTotals(lines, 1500, 2100)).toEqual({
      baseCents: 20000,
      ivaCents: 4200,
      irpfCents: 3000,
      totalCents: 21200,
    });
  });

  it("rounds each line to the cent, and half a cent goes to the even cent", () => {
    // 0,5 x 1,01 = 0,505 goes to 0,50; 0,5 x 1,03 = 0,515 goes to 0,52.
    expect(
      lineTotalCents({
        description: "x",
        quantityHundredths: 50,
        unitPriceCents: 101,
      }),
    ).toBe(50);
    expect(
      lineTotalCents({
        description: "x",
        quantityHundredths: 50,
        unitPriceCents: 103,
      }),
    ).toBe(52);
  });

  it("with no lines everything is zero", () => {
    expect(invoiceTotals([], 1500, 2100).totalCents).toBe(0);
  });
});

describe("The due date", () => {
  it("is the issue date plus the days", () => {
    expect(dueDateFrom("2026-11-19", 30)).toBe("2026-12-19");
    expect(dueDateFrom("2026-12-20", 30)).toBe("2027-01-19");
    expect(dueDateFrom("2026-11-19", 0)).toBe("2026-11-19");
  });
});

const TODAY = "2026-11-19";
const VALID: InvoiceInput = {
  clientId: "c1",
  issueDate: "2026-11-19",
  dueDate: "",
  irpf: "15",
  iva: "21",
  lines: [
    { description: " Diseño ", quantity: "2", unitPrice: "100" },
    { description: "", quantity: "", unitPrice: "" },
  ],
};

describe("Validating an invoice", () => {
  it("keeps the real lines and ignores a line left empty", () => {
    expect(validateInvoice(VALID, TODAY)).toEqual({
      invoice: {
        clientId: "c1",
        issueDate: "2026-11-19",
        dueDate: null,
        irpfBp: 1500,
        ivaBp: 2100,
        lines: [
          {
            description: "Diseño",
            quantityHundredths: 200,
            unitPriceCents: 10000,
          },
        ],
      },
    });
  });

  it("asks for a client, valid percentages and at least one line", () => {
    expect(
      validateInvoice(
        { ...VALID, clientId: "", irpf: "x", iva: "", lines: [] },
        TODAY,
      ),
    ).toEqual({
      errors: {
        clientId: "Elige un cliente",
        irpf: "Introduce un porcentaje válido",
        iva: "Introduce un porcentaje válido",
        lines: "Añade al menos una línea",
      },
    });
  });

  it("refuses a half-written line", () => {
    const result = validateInvoice(
      {
        ...VALID,
        lines: [{ description: "Diseño", quantity: "", unitPrice: "5" }],
      },
      TODAY,
    );
    expect(result).toHaveProperty("errors.lines");
  });

  it("the issue date goes back to today when empty, and the due date is optional but real", () => {
    expect(validateInvoice({ ...VALID, issueDate: "" }, TODAY)).toMatchObject({
      invoice: { issueDate: TODAY },
    });
    expect(validateInvoice({ ...VALID, dueDate: "2026-02-31" }, TODAY)).toEqual(
      {
        errors: { dueDate: "Introduce una fecha válida" },
      },
    );
  });
});

describe("The data of the issuer", () => {
  const EMPTY = {
    name: "",
    taxId: "",
    phone: "",
    address: "",
    email: "",
    iban: "",
  };

  it("is all optional and empty is no data", () => {
    expect(validateIssuer({ ...EMPTY, name: " Mi SL " })).toEqual({
      issuer: {
        name: "Mi SL",
        taxId: null,
        phone: null,
        address: null,
        email: null,
        iban: null,
      },
    });
  });

  it("has a limit for each text", () => {
    expect(validateIssuer({ ...EMPTY, address: "a".repeat(201) })).toEqual({
      errors: {
        address: "La dirección es demasiado larga (máximo 200 caracteres)",
      },
    });
  });
});

describe("The billing defaults", () => {
  const OK = {
    irpf: "15",
    iva: "21",
    numberFormat: "YYYY-NNN",
    numberNext: "1",
    dueDays: "30",
  };

  it("accepts the starting values", () => {
    expect(validateBilling(OK)).toEqual({
      billing: {
        irpfBp: 1500,
        ivaBp: 2100,
        numberFormat: "YYYY-NNN",
        numberNext: 1,
        dueDays: 30,
      },
    });
  });

  it("needs NNN in the format, a positive next number and a sensible number of days", () => {
    expect(
      validateBilling({
        ...OK,
        numberFormat: "YYYY",
        numberNext: "0",
        dueDays: "400",
      }),
    ).toEqual({
      errors: {
        numberFormat: "El formato debe incluir NNN",
        numberNext: "Introduce un número válido",
        dueDays: "Introduce un número válido",
      },
    });
  });
});
