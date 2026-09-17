"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { field, fieldLabel } from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (mode === "sign-up") {
      setSignUpDone(true);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "sign-in" ? "Iniciá sesión para continuar" : "Creá tu cuenta"}
          </p>
        </div>

        {signUpDone ? (
          <p className="rounded-md bg-muted p-4 text-sm">
            Revisá tu email para confirmar la cuenta y luego iniciá sesión.
          </p>
        ) : (
          <form className="space-y-5 rounded-lg border border-border bg-card p-6" onSubmit={handleSubmit}>
            <label className={fieldLabel} htmlFor="email">
              Email
              <input
                autoComplete="email"
                className={field}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className={fieldLabel} htmlFor="password">
              Contraseña
              <input
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                className={field}
                id="password"
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "..." : mode === "sign-in" ? "Iniciar sesión" : "Registrarse"}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setSignUpDone(false);
            setError(null);
          }}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2"
        >
          {mode === "sign-in" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
        </button>
      </div>
    </div>
  );
}
