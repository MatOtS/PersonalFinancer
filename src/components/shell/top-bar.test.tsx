import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { TopBar } from "./top-bar";

describe("TopBar", () => {
  it("has the button to add a movement, on the right", () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <TopBar />
      </ToastProvider>,
    );
    expect(html).toContain("Añadir movimiento");
    expect(html).toMatch(/<button[^>]*>/);
    expect(html).toContain("justify-end");
  });
});
