"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TextField } from "@/components/ui/text-field";
import { consumeSessionMark } from "@/domain/auth/session-mark";
import {
  validateSignIn,
  type SignInErrors,
} from "@/domain/auth/validate-sign-in";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { email: "", errors: {}, message: null };

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<SignInErrors>({});
  const [expired, setExpired] = useState(false);

  // A tab that showed a protected page and now lands here had its session end
  // (FR-18). A new tab, or one where the user signed out, shows nothing.
  useEffect(() => {
    // sessionStorage only exists in the browser, so it cannot be read while
    // rendering on the server without the two renders disagreeing.
    // In development React runs this twice: the second time the mark is
    // already consumed, so the result may only turn the message on, never off.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consumeSessionMark(window.sessionStorage)) setExpired(true);
  }, []);
  const errors =
    clientErrors.email || clientErrors.password ? clientErrors : state.errors;

  // FR-9: an empty field is reported before anything is sent, and the focus
  // goes to the first empty one.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = validateSignIn({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    setClientErrors(found);
    if (found.email || found.password) {
      event.preventDefault();
      const first = found.email ? "email" : "password";
      (form.elements.namedItem(first) as HTMLInputElement).focus();
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {pending && (
        <div className="absolute inset-x-0 top-0">
          <ProgressBar label="Iniciando sesión" />
        </div>
      )}
      <input type="hidden" name="next" value={next} />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        readOnly={pending}
        error={errors.email}
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        readOnly={pending}
        error={errors.password}
      />

      <div aria-live="polite" className="flex flex-col gap-2">
        {expired && !pending && (
          <p className="text-small text-warning">
            Tu sesión ha terminado. Inicia sesión de nuevo
          </p>
        )}
        {pending ? (
          <span className="sr-only">Iniciando sesión</span>
        ) : (
          state.message && (
            <p className="text-small text-negative">{state.message}</p>
          )
        )}
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={pending}
        className="w-full justify-center"
      >
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
