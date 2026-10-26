// What a tab needs to remember to show the expired-session message (ADR-17).
// It is kept per tab (sessionStorage), not in a cookie: a cookie is shared by
// every tab, so it could not tell "this tab signed out" from "the session ended
// under this tab".
export type MarkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const SESSION_MARK_KEY = "hadSession";

// Every function swallows storage errors: a browser that blocks storage only
// loses the message, nothing else.
export function markSession(storage: MarkStorage): void {
  try {
    storage.setItem(SESSION_MARK_KEY, "1");
  } catch {
    // No storage, no message.
  }
}

// Used by the sign-out button: signing out on purpose is not an expired session.
export function clearSessionMark(storage: MarkStorage): void {
  try {
    storage.removeItem(SESSION_MARK_KEY);
  } catch {
    // No storage, no message.
  }
}

// True if this tab had a session; the mark is removed so the message shows once.
export function consumeSessionMark(storage: MarkStorage): boolean {
  try {
    const had = storage.getItem(SESSION_MARK_KEY) !== null;
    storage.removeItem(SESSION_MARK_KEY);
    return had;
  } catch {
    return false;
  }
}
