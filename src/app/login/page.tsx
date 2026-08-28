"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "sign-in" ? "Iniciá sesión para continuar" : "Creá tu cuenta"}
          </p>
        </div>

        {signUpDone ? (
          <p className="rounded-md bg-muted p-4 text-sm">
            Revisá tu email para confirmar la cuenta y luego iniciá sesión.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

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
