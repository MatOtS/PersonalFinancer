import { House, Wallet } from "@phosphor-icons/react/ssr";
import type { ThemePreference } from "@/domain/theme";
import { NavItem } from "./nav-item";
import { ThemeControl } from "./theme-control";

type SidebarProps = {
  themePreference: ThemePreference;
};

// Only the sections that exist are listed (FR-24). Each spec adds its own item.
export const Sidebar = ({ themePreference }: SidebarProps) => {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      <div className="flex items-center gap-2.5 px-3 pb-6">
        <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent">
          <Wallet size={20} />
        </span>
        <span className="text-body font-bold">PersonalFinancer</span>
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-1">
        <NavItem href="/" label="Inicio" icon={<House size={20} />} />
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <ThemeControl initialPreference={themePreference} />
      </div>
    </aside>
  );
};
