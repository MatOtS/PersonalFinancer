export type AccessRequest = {
  pathname: string;
  search: string;
  hasValidSession: boolean;
};

export type AccessDecision =
  { kind: "continue" } | { kind: "redirect"; to: string };

const SIGN_IN_PATH = "/login";

// What to do with a request, knowing only where it goes and whether there is a
// valid session. Any address except the sign-in page counts as protected, even
// one that does not exist, so the app does not reveal which pages exist (FR-13).
export function decideAccess({
  pathname,
  search,
  hasValidSession,
}: AccessRequest): AccessDecision {
  if (pathname === SIGN_IN_PATH) {
    return hasValidSession
      ? { kind: "redirect", to: "/" }
      : { kind: "continue" };
  }

  if (hasValidSession) return { kind: "continue" };

  // Remember the page, query string included, so signing in can return to it.
  return {
    kind: "redirect",
    to: `${SIGN_IN_PATH}?next=${encodeURIComponent(pathname + search)}`,
  };
}
