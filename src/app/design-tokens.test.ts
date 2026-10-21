import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Keeps globals.css in sync with the color table of docs/design.md: every token
// must exist once, with the dark value and the light value written in the doc.

const root = process.cwd();
const designDoc = readFileSync(join(root, "docs/design.md"), "utf8");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

type ColorToken = { name: string; dark: string; light: string };

function colorTokensFromDesignDoc(markdown: string): ColorToken[] {
  const section = markdown.split("### Colors")[1]?.split("###")[0] ?? "";
  const rows = section.matchAll(
    /^\| `([a-z-]+)` \| [^|]+ \| `(#[0-9A-F]{6})` \| `(#[0-9A-F]{6})` \|$/gm,
  );
  return [...rows].map(([, name = "", dark = "", light = ""]) => ({
    name,
    dark,
    light,
  }));
}

function cssValueOf(token: string): string | undefined {
  const match = css.match(new RegExp(`--${token}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

describe("design tokens", () => {
  const tokens = colorTokensFromDesignDoc(designDoc);

  it("reads every hex color token from the design doc", () => {
    // 13 tokens with hex values; accent-soft is defined from accent.
    expect(tokens.map((token) => token.name)).toEqual([
      "bg",
      "surface",
      "raised",
      "border",
      "control-border",
      "text",
      "text-muted",
      "accent",
      "on-accent",
      "positive",
      "negative",
      "info",
      "warning",
    ]);
  });

  it.each(colorTokensFromDesignDoc(designDoc))(
    "defines --$name with the light and dark values of the design doc",
    ({ name, dark, light }) => {
      expect(cssValueOf(name)?.toUpperCase()).toBe(
        `LIGHT-DARK(${light}, ${dark})`,
      );
    },
  );

  it("defines accent-soft as the accent at 10% (light) and 12% (dark)", () => {
    expect(cssValueOf("accent-soft")).toBe(
      "light-dark(rgb(8 127 91 / 10%), rgb(46 230 160 / 12%))",
    );
  });

  it("lets the data-theme attribute force each theme", () => {
    expect(css).toMatch(
      /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;/,
    );
    expect(css).toMatch(
      /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;/,
    );
  });

  it("follows the system when there is no data-theme attribute", () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark;/);
  });
});
