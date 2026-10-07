# Plan 002: Access and session

Spec: `specs/002-access/spec.md`

Split from the plan of the original spec "001 Access and app shell" (approved 2026-10-07). Decisions are unchanged; it builds on `specs/001-app-shell/plan.md` (tokens, shell, theme, CSP in the proxy).

## Summary
The request gate (`src/proxy.ts`, created in 001 with the CSP) gains the session check: it verifies the session on the server for every page and redirects to `/login` when needed; the decision of what to do is a pure function, unit tested. Sign in and sign out are Server Actions that talk to Supabase Auth only through `src/data/auth.ts`.

## Files
| File | Action | Responsibility | FR |
|---|---|---|---|
| `src/domain/auth/normalize-email.ts` (+ test) | create | Trim and lowercase the email | Edge cases |
| `src/domain/auth/validate-sign-in.ts` (+ test) | create | Which fields are empty and their messages | FR-9 |
| `src/domain/auth/sign-in-error.ts` (+ test) | create | Map an auth failure to one of the three user messages | FR-3, FR-4, FR-5 |
| `src/domain/auth/safe-return-path.ts` (+ test) | create | Accept only internal return paths, otherwise Home | FR-15, FR-16 |
| `src/domain/auth/access.ts` (+ test) | create | Decide continue / redirect for a request | FR-10, FR-11, FR-13, FR-15, NFR security |
| `src/lib/env.ts` | create | Read and check the two public environment variables | NFR security |
| `src/lib/supabase/server.ts` | create | Supabase client for Server Components and Server Actions (cookies, 15 s timeout) | FR-5, FR-17 |
| `src/lib/supabase/proxy.ts` | create | Supabase client bound to the proxy request/response cookies | FR-17, FR-18 |
| `src/data/auth.ts` | create | `signIn`, `signOut`, `getSignedInUser`: the only code calling Supabase Auth | FR-2 to FR-5, FR-12, FR-20, FR-21, FR-26 |
| `src/proxy.ts` | modify | Add session refresh, access decision and `Cache-Control: no-store` on protected pages (nonce and CSP come from 001) | FR-10, FR-11, FR-13, FR-15, FR-17, FR-18, FR-22, NFR security |
| `src/app/login/page.tsx` | create | Sign-in page (server): reads the return path | FR-1, FR-15, FR-32 (of 001) |
| `src/app/login/sign-in-form.tsx` | create | Form (client): validation, pending state, errors, expired-session message | FR-1, FR-5 to FR-9, FR-18 |
| `src/app/login/actions.ts` | create | `signInAction` | FR-2 to FR-6, FR-12, FR-16 |
| `src/app/(app)/layout.tsx` | modify | Second server-side session check; pass the email to the sidebar | FR-26, NFR security |
| `src/app/(app)/actions.ts` | create | `signOutAction` | FR-20, FR-21 |
| `src/components/ui/text-field.tsx` | create | Label, input, error message, error state | FR-1, FR-6, FR-8, FR-9 |
| `src/components/ui/progress-bar.tsx` | create | Indeterminate progress bar | FR-7 |
| `src/components/shell/sidebar.tsx` | modify | Footer: email (ellipsis, full email in `title`) and sign-out next to the theme control | FR-26 |
| `src/components/shell/sign-out-button.tsx` | create | Form posting `signOutAction` | FR-19 to FR-21 |
| `src/components/shell/session-marker.tsx` | create | Marks this tab as having had a session (client) | FR-10, FR-18 |
| `supabase/seed.sql` | modify | Two fake local users for tests | Tests |
| `tests/e2e/access.spec.ts`, `tests/e2e/security.spec.ts` | create | Browser tests (Playwright set up in 001) | See Tests |
| `docs/architecture.md` | modify | ADR-17 (expired-session message) | - |

## Logic
All pure, no React, no Supabase, in `src/domain`.

- `normalizeEmail(raw: string): string`: trim and lowercase. Edge cases.
- `validateSignIn({ email, password }): { email?: string; password?: string }`: returns the message of each empty field ("Introduce tu email", "Introduce tu contraseña"); the email counts as empty after trimming, the password only if it has no characters at all (never trimmed). FR-9.
- `signInErrorMessage(failure: SignInFailure): string` where `SignInFailure` is `"invalid_credentials" | "rate_limited" | "unreachable"`. FR-3, FR-4, FR-5. The mapping from Supabase error codes to `SignInFailure` lives in `src/data/auth.ts`, because it depends on the library.
- `safeReturnPath(raw: string | null): string`: returns `raw` only if it starts with a single `/`, is not `//...` or `/\...`, has no scheme and is not `/login`; otherwise `/`. FR-16.
- `decideAccess({ pathname, search, hasValidSession }): AccessDecision` with `AccessDecision = { kind: "continue" } | { kind: "redirect"; to: string }`. FR-10, FR-11, FR-13, FR-15.

## Algorithm
Proxy, for every request except static assets and prefetches (additions to the 001 proxy):

```
nonce = random base64
supabase = proxy client bound to request/response cookies
claims = await supabase.auth.getClaims()        // verifies signature and expiry, refreshes if needed
hasValidSession = claims is not null
decision = decideAccess(pathname, search, hasValidSession)
  if pathname is "/login":
      hasValidSession ? redirect "/" : continue           // FR-11
  else (any other path, existing or not):                  // FR-13
      hasValidSession ? continue
                      : redirect "/login?next=" + encode(pathname + search)   // FR-10, FR-15
response = decision is redirect ? redirect response : next() with nonce headers (from 001)
copy refreshed auth cookies and Supabase cache headers onto response
set CSP (with nonce) on response (from 001)
if path is protected: set "Cache-Control: no-store"      // FR-22
```

Sign in (`signInAction(prevState, formData)`):

```
if await getSignedInUser() exists: redirect "/"           // FR-12, credentials ignored
email = normalizeEmail(formData.email); password = formData.password as typed
errors = validateSignIn(email, password); if any: return errors          // FR-9 (server repeats the client check)
result = await signIn(email, password)                    // 15 s timeout inside the data layer
if result is failure: return { message: signInErrorMessage(result.failure), email }   // FR-3..FR-6
redirect safeReturnPath(formData.next)                    // FR-2, FR-16
```

Sign out (`signOutAction`): call `signOut()` and ignore a network failure; always delete the auth cookies on the response; clear the tab's session marker on the client before submitting; redirect `/login`. FR-20, FR-21.

Expired-session message (FR-10 vs FR-18): a tab that has shown a protected page stores `hadSession = true` in `sessionStorage` (per tab, cleared when the tab closes). The explicit sign-out button removes it before signing out. When the sign-in form mounts, if the flag is present it shows "Tu sesión ha terminado. Inicia sesión de nuevo" and removes the flag. Result: the message appears in a tab that had a session that ended (causes 1 to 4 of the spec definition); a tab where the user signed out, or a new tab, shows no message. See ADR-17.

## UI
- **Sign-in page** (`/login`), centered card on `bg`, max width 400 px: brand, title "Iniciar sesión", the two text fields (`autocomplete="email"` and `"current-password"`, paste allowed), primary button full width. Progress bar on the top edge of the card while pending; fields read-only; button disabled with "Iniciando sesión…"; an `aria-live="polite"` region announces "Iniciando sesión" and the error messages. Error message above the button in `negative`. States: idle, field errors, pending, error, expired-session message. Theme applied from the root layout (FR-32 of 001). FR-1, FR-5 to FR-9, FR-18.
- **Sidebar footer** (addition to 001): the email (one line, ellipsis, `title` with the full email), next to the theme control, and the "Cerrar sesión" ghost button. FR-19, FR-26.
- Tokens, components and icons from 001 and `docs/design.md`; new components: text field and progress bar.

## Data
- No tables, no migrations: this spec stores no user data (spec NFR "User data isolation").
- Session: Supabase auth cookies managed by `@supabase/ssr`.
- `supabase/seed.sql`: two fake local users (`a@example.test`, `b@example.test`) for the browser tests, created only in the local database by `db:reset`. Fake data only (constitution 5).

## Decisions
| Decision | Discarded alternative | Reason |
|---|---|---|
| One gate in `proxy.ts` plus a second check in the `(app)` layout | Checking only in the proxy, or only in each page | The proxy covers every path, including unknown ones (FR-13); the layout check is defence in depth if the matcher is ever misconfigured. |
| `getClaims()` to check the session | `getSession()` (does not verify the token); `getUser()` (network call on every request) | Verifies signature and expiry, so tampered and expired cookies fail (NFR security), without a request per page. |
| Sign in and sign out as Server Actions with a plain `<form>` | Calling Supabase from the browser (legacy) | The password goes in a POST body to our server, never in the URL; FR-12 can be checked on the server; no browser client needed in this spec. |
| Expired-session message from a per-tab `sessionStorage` flag (ADR-17) | A long-lived cookie marker | A cookie is shared by all tabs and survives signing out, so it cannot tell "this tab signed out" (no message, FR-10) from "the session ended under this tab" (message, FR-18). |
| Browser tests for every flow | Manual browser checks only | Most FRs of this spec are flows across pages; constitution 4 and ADR-08. |

## Tests
| What is tested | Type | FR |
|---|---|---|
| `normalizeEmail`: spaces, capitals | unit | Edge cases |
| `validateSignIn`: each field empty, both empty, password of spaces is not empty | unit | FR-9, edge cases |
| `signInErrorMessage`: the three failures and exact Spanish texts | unit | FR-3, FR-4, FR-5 |
| `safeReturnPath`: `/x`, `/x?y=1`, `//evil.com`, `/\evil.com`, `https://evil.com`, `/login`, empty, null | unit | FR-15, FR-16 |
| `decideAccess`: matrix of path (login, protected, unknown) × session | unit | FR-10, FR-11, FR-13, FR-15 |
| Data layer maps Supabase errors (invalid credentials, 429, network error, timeout via injected fetch) | unit | FR-3, FR-4, FR-5 |
| Sign in OK lands on Home; with `?next=` lands on that page; external `next` lands on Home | e2e | FR-2, FR-15, FR-16 |
| Wrong password and unknown email show the same message; email kept, password cleared | e2e | FR-3, FR-6 |
| Empty fields: messages, error state, focus on first empty field, no request sent | e2e | FR-9 |
| Pending state: button text, disabled, fields read-only, progress bar (slowed network) | e2e | FR-7 |
| Autocomplete attributes present, paste works | e2e | FR-8 |
| No session: protected page, unknown page → `/login` with `next` | e2e | FR-10, FR-13, FR-15 |
| Session: `/login` → Home; stale form submit in a second tab → Home with the existing session | e2e | FR-11, FR-12 |
| Session survives a new browser context with the stored cookies | e2e | FR-17 |
| Sign out in tab A, action in tab B → login with the expired message; tab A shows no message | e2e | FR-18, FR-10 |
| Sign out: lands on login; back button shows login; protected responses carry `no-store` | e2e | FR-19, FR-20, FR-22 |
| Sign out with the auth service blocked still lands on login with cookies removed | e2e | FR-21 |
| Sidebar footer: email with full `title`, sign-out button | e2e + visual | FR-26 |
| Protected page requested with no cookie, tampered cookie and expired cookie → redirect to login, body without protected content | e2e (request API) | NFR security |
| Zero CSP violations in the console on the sign-in page in all its states | e2e | NFR security |
| Keyboard-only flow: sign in, navigate, sign out | e2e | NFR accessibility |
| Visual check at 1280 px, light and dark: login (all states), sidebar footer | visual (Chrome DevTools MCP) | FR-1, FR-7, FR-26 |

FR-4 is covered by the unit tests of the mapping; reproducing the real rate limit in the browser test would make it slow and flaky.

## Risks
- **Next 16 APIs differ from training data** (`proxy.ts`, cookies, Server Actions). Mitigation: read the bundled guide before each file; the plan follows `content-security-policy.md` and `proxy.md`.
- **Refresh token races between tabs** (documented in `@supabase/ssr`): two tabs refreshing at once can drop one request to "no session". Mitigation: the proxy refreshes once per navigation; FR-18 already defines the outcome as "sign in again".
- **The expired cookie test needs a signed expired token.** Mitigation: generate it in the test setup with the local stack's JWT secret (local only, never production).
