import { describe, expect, it } from "vitest";
import { MAX_LOGO_BYTES, validateLogo } from "./logo";

describe("The logo", () => {
  it("accepts a png and a jpg", () => {
    expect(validateLogo("image/png", 1000)).toEqual({
      type: "image/png",
      extension: "png",
    });
    expect(validateLogo("image/jpeg", 1000)).toEqual({
      type: "image/jpeg",
      extension: "jpg",
    });
  });

  it("refuses other formats, such as svg", () => {
    expect(validateLogo("image/svg+xml", 1000)).toEqual({
      error: "El logo debe ser una imagen png o jpg",
    });
  });

  it("accepts exactly 512 KB and refuses one byte more", () => {
    expect(validateLogo("image/png", MAX_LOGO_BYTES)).toHaveProperty("type");
    expect(validateLogo("image/png", MAX_LOGO_BYTES + 1)).toEqual({
      error: "El logo es demasiado grande (máximo 512 KB)",
    });
  });

  it("refuses an empty file (nothing chosen)", () => {
    expect(validateLogo("", 0)).toEqual({ error: "Elige un archivo" });
  });
});
