"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { findActiveNavItem } from "@/components/app-shared";

export function AppHeader() {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname);

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Separator
          className="mr-2 data-[orientation=vertical]:h-4 md:hidden"
          orientation="vertical"
        />
        <AppBreadcrumbs page={activeItem} />
      </div>
    </header>
  );
}
