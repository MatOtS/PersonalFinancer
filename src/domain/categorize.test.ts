import { describe, expect, it } from "vitest";
import { matchCategory, validateKeyword } from "./categorize";

const WORDS = [
  { keyword: "mercadona", categoryId: "food" },
  { keyword: "compra", categoryId: "shopping" },
];

describe("The category from the description", () => {
  it("is the one of the first word that the description contains, ignoring capitals", () => {
    expect(matchCategory("COMPRA MERCADONA 1234", WORDS)).toBe("food");
    expect(matchCategory("Compra en tienda", WORDS)).toBe("shopping");
  });

  it("with no word that matches, or no description, there is no category", () => {
    expect(matchCategory("Nómina", WORDS)).toBeNull();
    expect(matchCategory(null, WORDS)).toBeNull();
    expect(matchCategory("algo", [])).toBeNull();
  });
});

describe("A word of the user", () => {
  it("needs the word and a category, and is cleaned of spaces", () => {
    expect(validateKeyword("  Mercadona ", "c1")).toEqual({
      keyword: "Mercadona",
      categoryId: "c1",
    });
    expect(validateKeyword(" ", "")).toEqual({
      errors: {
        keyword: "Introduce una palabra",
        category: "Elige una categoría",
      },
    });
  });

  it("has a limit of 50 characters", () => {
    expect(validateKeyword("a".repeat(50), "c1")).toHaveProperty("keyword");
    expect(validateKeyword("a".repeat(51), "c1")).toHaveProperty(
      "errors.keyword",
    );
  });
});
