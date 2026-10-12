import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/sidebar";
import { parseThemePreference, THEME_COOKIE } from "@/domain/theme";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE)?.value,
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar themePreference={themePreference} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1280px] px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
