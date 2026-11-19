import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listClients } from "@/data/clients";
import { listInvoices, type InvoiceSummary } from "@/data/invoices";
import { listMovements } from "@/data/movements";
import FreelancePage from "./page";

vi.mock("@/data/clients", () => ({ listClients: vi.fn() }));
vi.mock("@/data/invoices", () => ({ listInvoices: vi.fn() }));
vi.mock("@/data/movements", () => ({ listMovements: vi.fn() }));
vi.mock("@/components/dashboard/period-picker", () => ({
  PeriodPicker: () => null,
}));
vi.mock("@/components/invoices/invoices-table", () => ({
  InvoicesTable: ({ invoices }: { invoices: unknown[] }) =>
    `facturas: ${invoices.length}`,
}));

const invoice = (
  status: InvoiceSummary["status"],
  netCents: number,
): InvoiceSummary => ({
  id: `${status}${netCents}`,
  number: status === "draft" ? null : "2026-001",
  clientName: "Acme",
  issueDate: "2026-11-10",
  dueDate: null,
  status,
  netCents,
});

const page = async () =>
  renderToStaticMarkup(
    await FreelancePage({ searchParams: Promise.resolve({}) }),
  );

beforeEach(() => {
  vi.mocked(listClients)
    .mockReset()
    .mockResolvedValue([
      { id: "k1", name: "Acme", taxId: null, address: null, email: null },
    ]);
  vi.mocked(listInvoices).mockReset().mockResolvedValue([]);
  vi.mocked(listMovements).mockReset().mockResolvedValue([]);
});

describe("FreelancePage", () => {
  it("only asks for the freelance movements", async () => {
    await page();
    expect(vi.mocked(listMovements)).toHaveBeenCalledWith(
      expect.objectContaining({ workKind: "freelance" }),
    );
  });

  it("counts only issued invoices as pending and drafts apart", async () => {
    vi.mocked(listInvoices).mockResolvedValue([
      invoice("issued", 100000),
      invoice("issued", 50000),
      invoice("draft", 999999),
      invoice("paid", 70000),
    ]);
    const html = await page();
    expect(html).toContain("1.500,00 €");
    expect(html).not.toContain("9.999,99 €");
    expect(html).toMatch(/Facturas pendientes de cobro<\/dt><dd[^>]*>2</);
    expect(html).toMatch(/Borradores<\/dt><dd[^>]*>1</);
    expect(html).toContain("facturas: 4");
  });

  it("shows the income by client, or says there is none", async () => {
    expect(await page()).toContain("Sin ingresos por cliente en este periodo");
    vi.mocked(listMovements).mockResolvedValue([
      {
        id: "m1",
        kind: "income",
        amountCents: 20000,
        date: "2026-11-10",
        description: null,
        accountId: "a1",
        categoryId: null,
        subcategoryId: null,
        workKind: "freelance",
        isFixed: false,
        clientId: "k1",
        source: "invoice",
      },
    ]);
    const html = await page();
    expect(html).toContain("Acme");
    expect(html).toContain("200,00 €");
  });

  it("links to a new invoice", async () => {
    expect(await page()).toContain('href="/facturas/nueva"');
  });
});
