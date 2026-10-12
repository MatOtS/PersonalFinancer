export type ThemePreference = "system" | "dark" | "light";

// Name of the cookie that stores the theme: written by the theme control and
// read by the root layout, so both must use this constant.
export const THEME_COOKIE = "theme";

// Lifetime of the theme cookie. max-age is in seconds (one year, within the
// 400 days that Chromium browsers allow at most).
export const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Strict on purpose: only the app writes the theme cookie, always as exactly
// "light" or "dark". Any other value (other casing, spaces, unknown text) was
// edited by hand or is damaged, so it falls back to "system".
export function parseThemePreference(
  value: string | undefined,
): ThemePreference {
  return value === "light" ? "light" : value === "dark" ? "dark" : "system";
}
