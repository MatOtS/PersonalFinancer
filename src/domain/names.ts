// Rules for the name of an account, a category or a subcategory. The same
// rules apply to all three, so they live in one place.

export const MAX_NAME_LENGTH = 50;

// Spaces around a name are never part of it ("  Wise  " is "Wise").
export function cleanName(raw: string): string {
  return raw.trim();
}

// The message to show, or null when the name is valid. The length is checked
// after cleaning, and counts characters (not UTF-16 units) like the database.
export function validateName(raw: string): string | null {
  const name = cleanName(raw);
  if (name === "") return "Introduce un nombre";
  if ([...name].length > MAX_NAME_LENGTH) {
    return `El nombre es demasiado largo (máximo ${MAX_NAME_LENGTH} caracteres)`;
  }
  return null;
}

const COMBINING_TILDE = "\u0303";

// Two names are the same when their keys are equal: capitals, accents and the
// spaces around them do not count. The database keeps this key under a unique
// index, so the rule lives here and the database only enforces it.
// The tilde of the "ñ" is kept: in Spanish it is a letter of its own, so
// "año" and "ano" are different names.
export function nameKey(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, (mark, position, text) =>
      mark === COMBINING_TILDE && text[position - 1] === "n" ? mark : "",
    )
    .normalize("NFC");
}

// Order for lists: ignores capitals and accents, and puts the "ñ" after "n"
// as Spanish does.
const collator = new Intl.Collator("es", { sensitivity: "base" });

export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}
