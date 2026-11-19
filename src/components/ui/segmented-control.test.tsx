import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "./segmented-control";

const OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "freelance", label: "Freelance" },
];

const render = (
  props: Partial<React.ComponentProps<typeof SegmentedControl>>,
) =>
  renderToStaticMarkup(
    <SegmentedControl
      name="workKind"
      label="Personal o freelance"
      options={OPTIONS}
      value=""
      onChange={() => {}}
      {...props}
    />,
  );

describe("SegmentedControl", () => {
  it("shows its label above the options only when asked to", () => {
    expect(render({ visibleLabel: true })).toMatch(
      /<span[^>]*>Personal o freelance<\/span>/,
    );
    expect(render({})).not.toMatch(/<span[^>]*>Personal o freelance<\/span>/);
  });

  it("has no error mark and no error text by default", () => {
    const html = render({});
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("border-negative");
  });

  it("only marks the options in red, with no text, when it is invalid", () => {
    const html = render({ invalid: true });
    expect(html).toMatch(/<fieldset[^>]*aria-invalid="true"/);
    expect(html).toContain("border-negative");
    expect(html).not.toMatch(/<p[ >]/);
  });

  it("shows its error under the options, linked for screen readers", () => {
    const html = render({ error: "Elige tipo de movimiento" });
    expect(html).toContain("Elige tipo de movimiento");
    expect(html).toMatch(/<fieldset[^>]*aria-invalid="true"/);
    expect(html).toMatch(/aria-describedby="[^"]+-error"/);
  });
});
