import type { NextConfig } from "next";

/*
 * Cabeceras de seguridad que no dependen de la petición.
 *
 * La `Content-Security-Policy` NO está aquí: lleva un nonce distinto en cada
 * carga, así que se construye en `src/proxy.ts`. Lo de aquí es lo que puede ser
 * el mismo valor siempre.
 */
const securityHeaders = [
  // No filtrar la ruta completa al navegar fuera del sitio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Que el navegador respete el Content-Type y no lo adivine.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // La app no usa ninguna de estas APIs; negarlas explícitamente.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
