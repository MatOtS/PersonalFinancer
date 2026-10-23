import type { Metadata } from "next";
import { WalletIcon } from "@phosphor-icons/react/ssr";
import { safeReturnPath } from "@/domain/auth/safe-return-path";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · PersonalFinancer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  // The page the user was going to, if it is a page of this app (FR-15, FR-16).
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-lg border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent">
            <WalletIcon size={20} />
          </span>
          <span className="text-body font-bold">PersonalFinancer</span>
        </div>
        <h1 className="mb-6 text-h2 font-semibold">Iniciar sesión</h1>
        <SignInForm next={returnPath} />
      </div>
    </main>
  );
}
