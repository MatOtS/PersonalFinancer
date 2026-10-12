"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "./is-active-path";

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export const NavItem = ({ href, label, icon }: NavItemProps) => {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-semibold ${
        active
          ? "bg-accent-soft text-accent"
          : "text-text-muted hover:bg-accent-soft hover:text-text"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
};
