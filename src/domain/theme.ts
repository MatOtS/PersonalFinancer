export type ThemePreference = "system" | "dark" | "light";

// Strict on purpose: only the app writes the theme cookie, always as exactly
// "light" or "dark". Any other value (other casing, spaces, unknown text) was
// edited by hand or is damaged, so it falls back to "system".
export function parseThemePreference(
  value: string | undefined,
): ThemePreference {
  return value === "light" ? "light" : value === "dark" ? "dark" : "system";
}
