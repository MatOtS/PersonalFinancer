// Supabase stores the session in cookies named sb-<project>-auth-token, split
// in numbered chunks (.0, .1...) when it is long, plus a "-code-verifier" one.
const SESSION_COOKIE = /^sb-.+-auth-token(-code-verifier|\.\d+)?$/;

export function isSessionCookie(name: string): boolean {
  return SESSION_COOKIE.test(name);
}
