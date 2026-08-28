"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/freelance", label: "Freelance" },
  { href: "/quick-add", label: "+ Gasto" },
  { href: "/invoices/new", label: "Facturar" },
  { href: "/import", label: "Importar" },
  { href: "/settings", label: "Ajustes" },
];

export function NavLinks({
  variant = "sidebar",
  onNavigate,
}: {
  variant?: "sidebar" | "bottom";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        const base =
          variant === "sidebar"
            ? "rounded-md px-3 py-2 text-sm font-medium"
            : "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium";
        const state = active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground";

        return (
          <Link key={link.href} href={link.href} onClick={onNavigate} className={`${base} ${state}`}>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Cerrar sesión
    </button>
  );
}
