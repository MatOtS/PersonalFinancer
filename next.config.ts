import type { NextConfig } from "next";

// Headers that do not depend on the request. The Content-Security-Policy is
// not here: it carries a per-request nonce, so src/proxy.ts builds it.
const securityHeaders = [
  // Do not leak the full path when navigating to another site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The browser must respect the declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The app uses none of these APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Hides the round "N" badge of the dev server; errors still show.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
