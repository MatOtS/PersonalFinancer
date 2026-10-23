import { HouseIcon, WalletIcon } from "@phosphor-icons/react/ssr";
import type { ThemePreference } from "@/domain/theme";
import { NavItem } from "./nav-item";
import { SignOutButton } from "./sign-out-button";
import { ThemeControl } from "./theme-control";

type SidebarProps = {
  email: string;
  themePreference: ThemePreference;
};

// Only the sections that exist are listed (FR-24). Each spec adds its own item.
export const Sidebar = ({ email, themePreference }: SidebarProps) => {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      <div className="flex items-center gap-2.5 px-3 pb-6">
        <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent">
          <WalletIcon size={20} />
        </span>
        <span className="text-body font-bold">PersonalFinancer</span>
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-1">
        <NavItem href="/" label="Inicio" icon={<HouseIcon size={20} />} />
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <ThemeControl initialPreference={themePreference} />
        {/* Cut with "..." on one line; the full email is in the title (FR-26). */}
        <p title={email} className="truncate px-3 text-small text-text-muted">
          {email}
        </p>
        <SignOutButton />
      </div>
    </aside>
  );
};
