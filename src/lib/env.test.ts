import { describe, expect, it } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  it("returns the value when it is set", () => {
    expect(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321"),
    ).toBe("http://localhost:54321");
  });

  it.each([[undefined], [""], ["   "]])(
    "fails with the variable name when the value is %j",
    (value) => {
      expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_URL", value)).toThrow(
        "NEXT_PUBLIC_SUPABASE_URL",
      );
    },
  );
});
