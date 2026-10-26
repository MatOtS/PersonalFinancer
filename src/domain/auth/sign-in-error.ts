// The only three ways a sign-in attempt can fail, as far as the user is told.
// Turning a Supabase error into one of these lives in src/data/auth.ts,
// because it depends on the library.
export type SignInFailure =
  "invalid_credentials" | "rate_limited" | "unreachable";

// One generic text for wrong email, wrong password and unknown account, so the
// message never reveals which of them failed (FR-3).
const messages: Record<SignInFailure, string> = {
  invalid_credentials: "Email o contraseña incorrectos",
  rate_limited: "Demasiados intentos. Espera unos minutos",
  unreachable: "No hemos podido conectar. Reintenta",
};

export function signInErrorMessage(failure: SignInFailure): string {
  return messages[failure];
}
