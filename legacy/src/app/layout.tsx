import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Kept for the few places that genuinely want a monospaced face (chart
// tooltips). The page itself is set in the sans face.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Dashboard de finanzas personales y freelance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn("h-full antialiased", geistSans.variable, geistMono.variable, "font-sans")}
      lang="es"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
