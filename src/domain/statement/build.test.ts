import { describe, expect, it } from "vitest";
import { buildRows, duplicateKeys, foreignCurrenciesOf } from "./build";
import { proposeMapping } from "./columns";
import { parseRate } from "./rate";
import { gridToTable } from "./table";

// Invented data: no real statement is in the repository (principle 5).
const SPANISH = gridToTable([
  ["Extracto de la cuenta", "", "", ""],
  ["IBAN ES00 0000 0000 0000 0000 0000", "", "", ""],
  ["", "", "", ""],
  ["Fecha", "Concepto", "Importe", "Saldo"],
  ["14/09/2026", "COMPRA MERCADONA", "-23,45", "1.000,00"],
  ["15/09/2026", "NOMINA SEPTIEMBRE", "1.500,00", "2.500,00"],
  ["16/09/2026", "", "-0,00", "2.500,00"],
  ["fecha mala", "ROTO", "-1,00", "2.499,00"],
  ["17/09/2026", "SIN IMPORTE", "abc", "2.499,00"],
]);

describe("Reading the statement and proposing the columns", () => {
  it("finds the header among the title rows and proposes by content", () => {
    expect(SPANISH.headers).toEqual(["Fecha", "Concepto", "Importe", "Saldo"]);
    expect(proposeMapping(SPANISH)).toEqual({
      date: "Fecha",
      description: "Concepto",
      amount: "Importe",
      sign: "",
    });
  });

  it("does not take the column of the balance as the amount", () => {
    const table = gridToTable([
      ["Fecha", "Saldo", "Importe", "Concepto"],
      ["01/10/2026", "1.000,00", "-5,00", "A"],
      ["02/10/2026", "995,00", "-10,00", "B"],
    ]);
    expect(proposeMapping(table).amount).toBe("Importe");
  });

  it("uses the columns remembered for the account when they are still in the file", () => {
    const mapping = proposeMapping(SPANISH, {
      date: "Fecha",
      description: "Concepto",
      amount: "Saldo",
      sign: "",
    });
    expect(mapping.amount).toBe("Saldo");
    expect(
      proposeMapping(SPANISH, { amount: "Columna que no existe" }).amount,
    ).toBe("Importe");
  });
});

describe("The movements about to be imported", () => {
  const mapping = proposeMapping(SPANISH);

  it("a negative amount is an expense, any other an income, always positive in cents", () => {
    const { rows } = buildRows(SPANISH, mapping, {});
    expect(
      rows.map((r) => [r.date, r.kind, r.amountCents, r.description]),
    ).toEqual([
      ["2026-09-14", "expense", 2345, "COMPRA MERCADONA"],
      ["2026-09-15", "income", 150000, "NOMINA SEPTIEMBRE"],
      ["2026-09-16", "income", 0, null],
    ]);
  });

  it("leaves out the rows without a real date or without an amount, and counts them", () => {
    const result = buildRows(SPANISH, mapping, {});
    expect(result.withoutDate).toBe(1);
    expect(result.withoutAmount).toBe(1);
  });
});

describe("A statement with the sign in another column", () => {
  const table = gridToTable([
    ["Date", "Description", "Amount", "Direction"],
    ["2026-09-14", "Coffee", "3.50", "OUT"],
    ["2026-09-15", "Refund", "10.00", "IN"],
    ["2026-09-16", "Unknown", "-4.00", "?"],
    ["2026-09-17", "Positive without word", "7.00", ""],
  ]);

  it("proposes the sign column and the type follows it, not the sign of the amount", () => {
    const mapping = proposeMapping(table);
    expect(mapping.sign).toBe("Direction");
    expect(
      buildRows(table, mapping, {}).rows.map((r) => [r.kind, r.amountCents]),
    ).toEqual([
      ["expense", 350],
      ["income", 1000],
      ["expense", 400],
      ["income", 700],
    ]);
  });
});

describe("Rows in another currency", () => {
  const table = gridToTable([
    ["Fecha", "Concepto", "Importe", "Divisa"],
    ["01/10/2026", "Hotel", "-100,00", "USD"],
    ["02/10/2026", "Pago", "50,00", "EUR"],
    ["03/10/2026", "Cobro", "200,00", "USD"],
  ]);
  const mapping = proposeMapping(table);

  it("finds the currencies other than the euro", () => {
    expect(foreignCurrenciesOf(table)).toEqual(["USD"]);
    expect(foreignCurrenciesOf(SPANISH)).toEqual([]);
  });

  it("converts them with the rate of their currency and never saves them as euros", () => {
    const parsed = parseRate("0,92", "euroPerUnit");
    if ("error" in parsed) throw new Error(parsed.error);
    const { rows } = buildRows(table, mapping, { USD: parsed.rate });
    expect(rows.map((r) => [r.currency, r.kind, r.amountCents])).toEqual([
      ["USD", "expense", 9200],
      ["EUR", "income", 5000],
      ["USD", "income", 18400],
    ]);
  });
});

describe("Possible duplicates", () => {
  it("a row with the same day, text, amount and type as a saved one", () => {
    const { rows } = buildRows(SPANISH, proposeMapping(SPANISH), {});
    const saved = [
      {
        date: "2026-09-14",
        description: "COMPRA MERCADONA",
        amountCents: 2345,
        kind: "expense",
      },
      {
        date: "2026-09-15",
        description: "NOMINA SEPTIEMBRE",
        amountCents: 150000,
        kind: "expense",
      },
    ];
    expect([...duplicateKeys(rows, saved)]).toEqual(["0"]);
  });
});
