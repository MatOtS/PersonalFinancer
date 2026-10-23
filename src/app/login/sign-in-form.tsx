"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TextField } from "@/components/ui/text-field";
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

      <div aria-live="polite">
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
