const HOME = "/";
const SIGN_IN_PATH = "/login";

// The return path comes from the address bar (?next=...), so anyone can write
// it. It is only used if it is a page of this app; otherwise the user goes Home.
export function safeReturnPath(raw: string | null): string {
  if (raw === null) return HOME;

  // Browsers drop tabs and line breaks inside an address, so "/\t/evil.com"
  // would become "//evil.com". Any control character is rejected.
  if (/\p{Cc}/u.test(raw)) return HOME;

  // Must start with exactly one "/". "//evil.com" (same protocol, other site)
  // and "/\evil.com" (browsers read "\" as "/") look internal but are not.
  // An address with a scheme ("https://...") does not start with "/" either.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return HOME;
  }

  // Going back to the sign-in page would be pointless.
  const pathWithoutQuery = raw.split(/[?#]/)[0];
  if (pathWithoutQuery === SIGN_IN_PATH) return HOME;

  return raw;
}
