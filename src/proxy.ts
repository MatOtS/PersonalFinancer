import { NextResponse, type NextRequest } from "next/server";
import { decideAccess, SIGN_IN_PATH } from "@/domain/auth/access";
import { buildContentSecurityPolicy } from "@/lib/security-headers";
import { createProxyClient } from "@/lib/supabase/proxy";

// Runs before every page is rendered: first gate of the app. It checks the
// session, sends the user to the sign-in page when needed, and sets the
// Content-Security-Policy. Next reads the nonce from the request's
// Content-Security-Policy header and applies it to its own scripts and styles.
export async function proxy(request: NextRequest) {
  const { supabase, applyTo } = createProxyClient(request);
  const { pathname, search } = request.nextUrl;

  // getClaims checks the signature and expiry of the token, and renews the
  // session if it can. If the service cannot be reached, the user is treated as
  // signed out: failing closed is safer than showing protected pages.
  let hasValidSession = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    hasValidSession = !error && data !== null;
  } catch {
    hasValidSession = false;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );

  const decision = decideAccess({ pathname, search, hasValidSession });
  let response: NextResponse;
  if (decision.kind === "redirect") {
    response = NextResponse.redirect(new URL(decision.to, request.url));
  } else {
    // Built after the session check, so it carries any renewed cookie.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  applyTo(response);
  response.headers.set("Content-Security-Policy", csp);
  // The browser must not keep a copy of a protected page (FR-22).
  if (pathname !== SIGN_IN_PATH) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

// Everything except static assets and prefetches, as in the Next guide.
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
