import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Manrope } from "next/font/google";
import "./globals.css";
import { parseThemePreference } from "@/domain/theme";

// Self-hosted at build time by next/font: no request to Google from the browser (ADR-10).
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "PersonalFinancer",
  description: "Finanzas personales y facturación freelance.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(cookieStore.get("theme")?.value);
  // With "system" the attribute is left out (null), so the CSS follows the
  // operating system through color-scheme. "light" or "dark" force a theme.

  return (
    <html
      lang="es"
      className={manrope.variable}
      data-theme={themePreference !== "system" ? themePreference : null}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
