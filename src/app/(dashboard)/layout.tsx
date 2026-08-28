import { NavLinks, SignOutButton } from "@/components/nav-links";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden shrink-0 flex-col gap-1 border-r border-border p-4 md:flex md:w-48">
        <h1 className="mb-4 px-3 text-lg font-semibold">Finanzas</h1>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks />
        </nav>
        <SignOutButton />
      </aside>

      <header className="flex items-center justify-between border-b border-border p-3 md:hidden">
        <h1 className="text-lg font-semibold">Finanzas</h1>
        <SignOutButton />
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-border bg-background p-2 md:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
