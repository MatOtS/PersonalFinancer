import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * El origen de Supabase, que hay que permitir explícitamente en la CSP: es el
 * único sitio externo con el que habla la app. Se lee con cuidado porque el
 * build puede correr sin variables de entorno, y una excepción aquí tumbaría
 * todas las peticiones.
 */
function supabaseOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
}

/**
 * Construye la CSP de esta petición.
 *
 * El nonce es un valor aleatorio de un solo uso: va en esta cabecera y Next lo
 * pone como atributo en sus propios scripts. El navegador ejecuta solo los que
 * lo llevan, así que un `<script>` inyectado a través de datos guardados queda
 * inerte — no puede conocer un número que se generó al servir la página.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = supabaseOrigin();

  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir las
    // trazas de error del servidor en el navegador.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Sin nonce a propósito: recharts escribe atributos `style` en los
    // elementos y el componente de gráfico inyecta su propio <style>. Poner un
    // nonce aquí haría que el navegador ignorase 'unsafe-inline' y se caerían
    // los gráficos. El vector que importa es la ejecución de scripts, y
    // `script-src` sí queda estricto.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ""}`,
    // next/font descarga Geist en tiempo de compilación y la sirve desde
    // /_next/static, así que no hace falta ningún origen de terceros.
    "font-src 'self'",
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    // Esto es lo que impide que alguien meta tu panel en un iframe.
    "frame-ancestors 'none'",
  ];

  // En desarrollo se sirve por http y el simulador de Supabase también, así que
  // forzar https rompería las llamadas locales.
  if (!isDev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  /*
   * Next lee el nonce de la cabecera de PETICIÓN para poder marcar sus scripts
   * durante el renderizado en servidor. Se reconstruye en cada uso porque el
   * refresco de sesión de Supabase muta las cookies de la petición, y hay que
   * reenviar las nuevas.
   */
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return headers;
  };

  let response = NextResponse.next({ request: { headers: forwardedHeaders() } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: forwardedHeaders() } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  // Las redirecciones también salen con la CSP: si no, la pantalla de destino
  // se cargaría sin ella.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  };

  if (!user && !isAuthRoute) return redirectTo("/login");
  if (user && isAuthRoute) return redirectTo("/home");

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
