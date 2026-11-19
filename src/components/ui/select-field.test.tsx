import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelectField } from "./select-field";

const OPTIONS = [
  { value: "a1", label: "BBVA" },
  { value: "a2", label: "Wise" },
];

const render = (props: Partial<React.ComponentProps<typeof SelectField>>) =>
  renderToStaticMarkup(
    <SelectField
      label="Cuenta"
      name="accountId"
      options={OPTIONS}
      value={null}
      onValueChange={() => {}}
      placeholder="Elige una cuenta"
      {...props}
    />,
  );

describe("SelectField", () => {
  it("has a visible label and shows the placeholder while nothing is chosen", () => {
    const html = render({});
    expect(html).toContain("Cuenta");
    expect(html).toContain("Elige una cuenta");
  });

  it("shows the label of the chosen option", () => {
    const html = render({ value: "a2" });
    expect(html).toContain("Wise");
  });

  it("is sent with the form under its name", () => {
    expect(render({ value: "a1" })).toMatch(/name="accountId"/);
  });

  it("shows its error under the field, linked for screen readers", () => {
    const html = render({ error: "Debes elegir una cuenta" });
    expect(html).toContain("Debes elegir una cuenta");
    expect(html).toMatch(/aria-invalid="true"/);
    expect(html).toMatch(/aria-describedby="[^"]+-error"/);
  });

  it("has no error text when there is none", () => {
    expect(render({})).not.toContain("aria-invalid");
  });
});
