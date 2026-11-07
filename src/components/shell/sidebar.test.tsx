import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";

// The sidebar reads the current path from Next's router; here it is fixed.
vi.mock("next/navigation", () => ({ usePathname: () => "/ajustes" }));

describe("Sidebar", () => {
  it("lists 'Inicio' and 'Ajustes' and marks 'Ajustes' as the current page", () => {
    const html = renderToStaticMarkup(
      <Sidebar email="ana@example.com" themePreference="system" />,
    );
    // The attributes come in any order, so each link is found by its href.
    const links = html.match(/<a [^>]*>/g) ?? [];
    const home = links.find((link) => link.includes('href="/"'));
    const settings = links.find((link) => link.includes('href="/ajustes"'));

    expect(home).toBeDefined();
    expect(home).not.toContain("aria-current");
    expect(settings).toContain('aria-current="page"');
    expect(html).toContain("Ajustes");
  });
});
