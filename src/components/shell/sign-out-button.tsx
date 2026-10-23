"use client";

import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { clearSessionMark } from "@/domain/auth/session-mark";

export function SignOutButton() {
  return (
    <form
      action={signOutAction}
      // Signing out on purpose must not show the "session ended" message.
      onSubmit={() => clearSessionMark(window.sessionStorage)}
    >
      <Button
        variant="ghost-destructive"
        type="submit"
        className="w-full justify-start"
      >
        <SignOutIcon size={20} />
        Cerrar sesión
      </Button>
    </form>
  );
}
