// The category of a movement from its description (work item 005): the first
// word of the user that the description contains, ignoring capitals.

export type Keyword = {
  keyword: string;
  categoryId: string;
};

export function matchCategory(
  description: string | null,
  keywords: Keyword[],
): string | null {
  if (!description) return null;
  const text = description.toLowerCase();
  const match = keywords.find((item) =>
    text.includes(item.keyword.toLowerCase()),
  );
  return match?.categoryId ?? null;
}

export const MAX_KEYWORD_LENGTH = 50;
export const EMPTY_KEYWORD = "Introduce una palabra";
export const MISSING_KEYWORD_CATEGORY = "Elige una categoría";

// The word is cleaned of the spaces around it, and its key (what makes two
// words the same) ignores capitals and accents.
export function validateKeyword(
  raw: string,
  categoryId: string,
):
  | { errors: { keyword?: string; category?: string } }
  | { keyword: string; categoryId: string } {
  const errors: { keyword?: string; category?: string } = {};
  const keyword = raw.trim();
  if (keyword === "") errors.keyword = EMPTY_KEYWORD;
  else if ([...keyword].length > MAX_KEYWORD_LENGTH) {
    errors.keyword = `La palabra es demasiado larga (máximo ${MAX_KEYWORD_LENGTH} caracteres)`;
  }
  if (categoryId.trim() === "") errors.category = MISSING_KEYWORD_CATEGORY;
  if (errors.keyword || errors.category) return { errors };
  return { keyword, categoryId: categoryId.trim() };
}
