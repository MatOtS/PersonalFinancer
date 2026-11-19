import { describe, expect, it } from "vitest";
import { clientWith, json, recording, type Recorded } from "./fake-client";
import {
  createDraftWithClient,
  deleteDraftWithClient,
  getSettingsWithClient,
  INVOICE_NOT_DRAFT,
  INVOICE_NOT_ISSUED,
  issueInvoiceWithClient,
  listInvoicesWithClient,
  NO_ACCOUNTS_TO_PAY,
  NUMBER_TAKEN,
  payInvoiceWithClient,
  DEFAULT_BILLING,
} from "./invoices";

const INVOICE = {
  clientId: "c1",
  issueDate: "2026-11-19",
  dueDate: null,
  irpfBp: 1500,
  ivaBp: 2100,
  lines: [
    { description: "Diseño", quantityHundredths: 200, unitPriceCents: 10000 },
  ],
};

const rpcError = (code: string) =>
  json(code === "23505" ? 409 : 400, {
    code,
    message: "boom",
    details: null,
    hint: null,
  });

describe("The settings", () => {
  it("are the default values when nothing was saved", async () => {
    const { fetchImpl } = recording(() => json(200, []));
    const settings = await getSettingsWithClient(clientWith(fetchImpl));
    expect(settings.billing).toEqual(DEFAULT_BILLING);
    expect(settings.issuer.name).toBeNull();
  });
});

describe("Creating a draft", () => {
  it("saves the header and then the lines, without a number", async () => {
    const { fetchImpl, requests } = recording((request) =>
      request.table === "invoices"
        ? json(201, { id: "i1" })
        : new Response(null, { status: 201 }),
    );
    const result = await createDraftWithClient(clientWith(fetchImpl), INVOICE);
    expect(result).toEqual({ ok: true, id: "i1" });
    expect(requests.map((r: Recorded) => r.table)).toEqual([
      "invoices",
      "invoice_lines",
    ]);
    expect(requests[0]?.body).not.toHaveProperty("invoice_number");
    expect(requests[1]?.body).toEqual([
      {
        invoice_id: "i1",
        position: 0,
        description: "Diseño",
        quantity_hundredths: 200,
        unit_price_cents: 10000,
      },
    ]);
  });

  it("removes the header when the lines fail", async () => {
    const { fetchImpl, requests } = recording((request) => {
      if (request.table === "invoices" && request.method === "POST") {
        return json(201, { id: "i1" });
      }
      if (request.table === "invoice_lines") {
        return json(500, {
          code: "XX000",
          message: "boom",
          details: null,
          hint: null,
        });
      }
      return new Response(null, { status: 204 });
    });
    await expect(
      createDraftWithClient(clientWith(fetchImpl), INVOICE),
    ).rejects.toThrow("Could not save the lines");
    expect(requests.at(-1)).toMatchObject({
      method: "DELETE",
      table: "invoices",
    });
  });
});

describe("Deleting", () => {
  it("only deletes a draft", async () => {
    const { fetchImpl, requests } = recording(() => json(200, []));
    expect(await deleteDraftWithClient(clientWith(fetchImpl), "i1")).toEqual({
      ok: false,
      error: INVOICE_NOT_DRAFT,
    });
    expect(requests[0]?.query).toContain("status=eq.draft");
  });
});

describe("Issuing", () => {
  it("asks the database for the number and says what went wrong", async () => {
    const ok = recording(() => json(200, "2026-001"));
    expect(
      await issueInvoiceWithClient(clientWith(ok.fetchImpl), "i1", 2026),
    ).toEqual({ ok: true });
    expect(ok.requests[0]).toMatchObject({
      table: "issue_invoice",
      body: { p_id: "i1", p_year: 2026 },
    });

    const notDraft = recording(() => rpcError("P0002"));
    expect(
      await issueInvoiceWithClient(clientWith(notDraft.fetchImpl), "i1", 2026),
    ).toEqual({ ok: false, error: INVOICE_NOT_DRAFT });

    const taken = recording(() => rpcError("23505"));
    expect(
      await issueInvoiceWithClient(clientWith(taken.fetchImpl), "i1", 2026),
    ).toEqual({ ok: false, error: NUMBER_TAKEN });
  });
});

describe("Paying", () => {
  const issued = {
    id: "i1",
    invoice_number: "2026-001",
    client_id: "c1",
    issue_date: "2026-11-19",
    due_date: null,
    irpf_bp: 1500,
    iva_bp: 2100,
    status: "issued",
    paid_date: null,
    clients: { name: "Acme", tax_id: null, address: null, email: null },
    invoice_lines: [
      {
        description: "A",
        quantity_hundredths: 100,
        unit_price_cents: 20000,
        position: 0,
      },
    ],
  };

  it("sends the net total of the lines to the database", async () => {
    const { fetchImpl, requests } = recording((request) =>
      request.table === "invoices"
        ? json(200, issued)
        : new Response(null, { status: 204 }),
    );
    const result = await payInvoiceWithClient(
      clientWith(fetchImpl),
      "i1",
      "2026-11-20",
    );
    expect(result).toEqual({ ok: true });
    // 200,00 + 21 % IVA - 15 % IRPF = 212,00.
    expect(requests.at(-1)).toMatchObject({
      table: "pay_invoice",
      body: { p_id: "i1", p_date: "2026-11-20", p_amount_cents: 21200 },
    });
  });

  it("refuses an invoice that is not issued without calling the database", async () => {
    const { fetchImpl, requests } = recording(() =>
      json(200, { ...issued, status: "paid" }),
    );
    expect(
      await payInvoiceWithClient(clientWith(fetchImpl), "i1", "2026-11-20"),
    ).toEqual({ ok: false, error: INVOICE_NOT_ISSUED });
    expect(requests).toHaveLength(1);
  });

  it("says it needs an account when the user has none", async () => {
    const { fetchImpl } = recording((request) =>
      request.table === "invoices" ? json(200, issued) : rpcError("P0003"),
    );
    expect(
      await payInvoiceWithClient(clientWith(fetchImpl), "i1", "2026-11-20"),
    ).toEqual({ ok: false, error: NO_ACCOUNTS_TO_PAY });
  });
});

describe("The list", () => {
  it("gives the net total of each invoice computed from its lines", async () => {
    const { fetchImpl } = recording(() =>
      json(200, [
        {
          id: "i1",
          invoice_number: null,
          issue_date: "2026-11-19",
          due_date: null,
          irpf_bp: 0,
          iva_bp: 2100,
          status: "draft",
          clients: { name: "Acme" },
          invoice_lines: [
            {
              description: "A",
              quantity_hundredths: 100,
              unit_price_cents: 10000,
            },
          ],
        },
      ]),
    );
    const [invoice] = await listInvoicesWithClient(clientWith(fetchImpl));
    expect(invoice).toMatchObject({
      clientName: "Acme",
      status: "draft",
      netCents: 12100,
    });
  });
});
