// Content Security Policy for every page. The nonce changes on each request,
// so only the scripts and styles Next itself renders can run (NFR security).
export function buildContentSecurityPolicy(
  nonce: string,
  isDev: boolean,
): string {
  const directives = [
    "default-src 'self'",
    // React needs eval in development only, to rebuild server stacks in the browser.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Next's own dev tools (the overlay and the "N" indicator) insert <style>
  // elements without a nonce. Only styles, never scripts, and never in production.
  if (isDev) directives.push("style-src-elem 'self' 'unsafe-inline'");
  // The local database is served over http, so this only applies outside development.
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
