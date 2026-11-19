import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionMarker } from "@/components/shell/session-marker";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { BaseUiProvider } from "@/components/ui/base-ui-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getSignedInUser } from "@/data/auth";
import { parseThemePreference, THEME_COOKIE } from "@/domain/theme";
import { SIGN_IN_PATH } from "@/domain/auth/access";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Second check, in case the proxy did not run on this request (for example a
  // mistake in its matcher): a protected page never renders without a session.
  const user = await getSignedInUser();
  if (!user) redirect(SIGN_IN_PATH);

  // The proxy gives each request a nonce for the Content-Security-Policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE)?.value,
  );

  return (
    <BaseUiProvider nonce={nonce}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <SessionMarker />
          <Sidebar email={user.email} themePreference={themePreference} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1280px] px-8 py-6">
              <TopBar />
              {children}
            </div>
          </main>
        </div>
      </ToastProvider>
    </BaseUiProvider>
  );
}
