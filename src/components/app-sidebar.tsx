"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { findActiveNavItem, navGroups } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";

export function AppSidebar() {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname);

  return (
    <Sidebar
      className="static min-h-full *:data-[slot=sidebar-inner]:bg-background"
      collapsible="offcanvas"
      variant="sidebar"
    >
      <SidebarHeader className="relative h-14 justify-center px-2 py-0">
        <Link
          className="flex h-10 w-max items-center rounded-none px-3 font-semibold hover:bg-muted dark:hover:bg-muted/50"
          href="/home"
        >
          Finanzas
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {group.label && (
              <SidebarGroupLabel className="font-normal">{group.label}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={item.url === activeItem?.url}
                    tooltip={item.title}
                    render={<Link href={item.url} />}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
