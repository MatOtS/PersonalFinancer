"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CaretUpDownIcon, GearIcon, SignOutIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // The Supabase client is created inside the effect, never during render:
  // this component is part of the shell that Next prerenders at build time,
  // and createClient() throws when the env vars are absent from the build
  // environment.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  const displayName = email?.split("@")[0] ?? "Cuenta";

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarMenu className="border-t p-2">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton className="text-muted-foreground" />}>
            <Avatar className="size-5">
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium text-sm">{displayName}</span>
            <CaretUpDownIcon className="ml-auto size-3!" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-48"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {email && (
              <>
                <DropdownMenuGroup>
                  <div className="truncate px-2 py-1.5 text-muted-foreground text-xs">{email}</div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <GearIcon />
                Ajustes
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} variant="destructive">
              <SignOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
