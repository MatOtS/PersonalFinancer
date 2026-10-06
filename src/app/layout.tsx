import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the browser (ADR-10).
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "PersonalFinancer",
  description: "Finanzas personales y facturación freelance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="font-[family-name:var(--font-manrope)] antialiased">
        {children}
      </body>
    </html>
  );
}
