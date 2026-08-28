import type { ReactNode } from "react";
import {
  HouseIcon,
  BriefcaseIcon,
  PlusCircleIcon,
  ReceiptIcon,
  UploadSimpleIcon,
  GearIcon,
} from "@phosphor-icons/react";

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: ReactNode;
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    label: "Finanzas",
    items: [
      { title: "Home", url: "/home", icon: <HouseIcon /> },
      { title: "Freelance", url: "/freelance", icon: <BriefcaseIcon /> },
    ],
  },
  {
    label: "Registrar",
    items: [
      { title: "Gasto rápido", url: "/quick-add", icon: <PlusCircleIcon /> },
      { title: "Emitir factura", url: "/invoices/new", icon: <ReceiptIcon /> },
      { title: "Importar CSV", url: "/import", icon: <UploadSimpleIcon /> },
    ],
  },
  {
    label: "Administración",
    items: [{ title: "Ajustes", url: "/settings", icon: <GearIcon /> }],
  },
];

export const navLinks: SidebarNavItem[] = navGroups.flatMap((group) => group.items);

/**
 * Longest-prefix match so nested routes (e.g. /invoices/new) still highlight
 * their nav entry, without /home matching every path.
 */
export function findActiveNavItem(pathname: string): SidebarNavItem | undefined {
  return navLinks
    .filter((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0];
}
