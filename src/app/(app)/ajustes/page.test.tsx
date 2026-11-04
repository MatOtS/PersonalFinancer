import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAccounts } from "@/data/accounts";
import SettingsPage from "./page";

// Same idea as page.test.tsx of Home: the page is rendered to HTML text.
vi.mock("@/data/accounts", () => ({ listAccounts: vi.fn() }));

beforeEach(() => {
  vi.mocked(listAccounts).mockReset();
});

describe("SettingsPage", () => {
  it("is titled 'Ajustes' and has the section 'Cuentas'", async () => {
    vi.mocked(listAccounts).mockResolvedValue([]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toMatch(/<h1[^>]*>Ajustes<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>Cuentas<\/h2>/);
    expect(html).toContain('id="cuentas"');
  });

  it("lists each account with its opening balance in euros", async () => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "1", name: "BBVA", openingBalanceCents: 125000 },
      { id: "2", name: "Wise", openingBalanceCents: -3500 },
    ]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("BBVA");
    expect(html).toContain("1.250,00 €");
    expect(html).toContain("Wise");
    expect(html).toContain("-35,00 €");
  });

  it("keeps the order the data layer gives, which is alphabetical", async () => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "1", name: "Ahorro", openingBalanceCents: 0 },
      { id: "2", name: "Wise", openingBalanceCents: 0 },
    ]);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html.indexOf("Ahorro")).toBeLessThan(html.indexOf("Wise"));
  });
});
