// The same email can be typed with spaces around it or with capitals, and it
// must still match the account, so both are removed before using it.
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
