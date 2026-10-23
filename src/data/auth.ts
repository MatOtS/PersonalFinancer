import { isAuthApiError, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { SignInFailure } from "@/domain/auth/sign-in-error";
import { isSessionCookie } from "@/lib/supabase/session-cookies";
import { createClient } from "@/lib/supabase/server";

export type SignInResult = { ok: true } | { ok: false; failure: SignInFailure };
export type SignedInUser = { id: string; email: string };

// Turns what Supabase says into one of the three failures the user is told
// about. Anything that is not a clear "the service rejected this attempt" is
// "unreachable": it is better to say we could not connect than to blame the
// password for a problem that is not the user's.
function toSignInFailure(error: unknown): SignInFailure {
  if (!isAuthApiError(error)) return "unreachable";
  if (error.status === 429) return "rate_limited";
  if (error.status >= 500) return "unreachable";
  return "invalid_credentials";
}

// Separate from signIn so a test can pass a client with a fake network.
export async function signInWithClient(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error
      ? { ok: false, failure: toSignInFailure(error) }
      : { ok: true };
  } catch {
    return { ok: false, failure: "unreachable" };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<SignInResult> {
  return signInWithClient(await createClient(), email, password);
}

// Ends only this browser's session ("local"), not the user's sessions on other
// devices. If the service cannot be reached the error is ignored, and the
// session cookies are removed anyway so nothing protected stays on this browser
// (FR-21).
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The cookies are removed below either way.
  }
  const cookieStore = await cookies();
  cookieStore
    .getAll()
    .filter(({ name }) => isSessionCookie(name))
    .forEach(({ name }) => cookieStore.delete(name));
}

// The signed-in user, or null. getClaims checks the signature and expiry of
// the token in the cookie, so a tampered or expired cookie gives null; reading
// the cookie without verifying it would trust whatever the browser sent.
export async function getSignedInUser(): Promise<SignedInUser | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data) return null;
    const { sub, email } = data.claims;
    return typeof email === "string" ? { id: sub, email } : null;
  } catch {
    return null;
  }
}
