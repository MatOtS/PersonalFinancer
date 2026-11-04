import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAccounts } from "@/data/accounts";
import HomePage from "./page";

// The page is rendered to HTML text on the server side only, so these tests
// need no browser: they check what the user would read.
vi.mock("@/data/accounts", () => ({ listAccounts: vi.fn() }));

beforeEach(() => {
  vi.mocked(listAccounts).mockReset();
});

describe("HomePage", () => {
  it("offers 'Añadir cuenta', pointing to the accounts section, when there are no accounts", async () => {
    vi.mocked(listAccounts).mockResolvedValue([]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Añadir cuenta");
    expect(html).toContain('href="/ajustes#cuentas"');
  });

  it("does not offer 'Añadir cuenta' once the user has an account", async () => {
    vi.mocked(listAccounts).mockResolvedValue([
      { id: "1", name: "BBVA", openingBalanceCents: 0 },
    ]);
    const html = renderToStaticMarkup(await HomePage());
    expect(html).not.toContain("Añadir cuenta");
  });
});
