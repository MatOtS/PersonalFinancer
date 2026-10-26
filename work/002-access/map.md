# Map 002: Access and session

Spec: `work/002-access/spec.md`

## Explored context
The request gate (`src/proxy.ts`, created in 001 with the policy) gains the session check: it verifies the session on the server for every page and redirects to `/login` when needed; the decision of what to do is a pure function, unit tested. Sign in and sign out are Server Actions that talk to Supabase Auth only through `src/data/auth.ts`.

**Logic** (all pure, in `src/domain/auth`): `normalizeEmail(raw)` trims and lowercases; `validateSignIn({ email, password })` returns the message of each empty field (the email counts as empty after trimming, the password only if it has no characters); `signInErrorMessage(failure)` with `"invalid_credentials" | "rate_limited" | "unreachable"` (the mapping from Supabase errors lives in `src/data/auth.ts`); `safeReturnPath(raw)` accepts only an internal path (no `//`, `/\`, scheme or control characters, and not `/login`), otherwise `/`; `decideAccess({ pathname, search, hasValidSession })` returns `continue` or `redirect`.

**Algorithm.** Proxy: create the Supabase client for the request, `getClaims()` (verifies signature and expiry, renews if possible), `decideAccess`, redirect or continue with the nonce headers of 001, copy renewed cookies onto the response, set the policy, and `Cache-Control: no-store` on every path except `/login`. Sign in (`signInAction`): if a session exists go Home; normalize the email; validate again on the server; `signIn`; on failure return the message and the typed email; on success redirect to `safeReturnPath(next)`. Sign out (`signOutAction`): `signOut()` (ignoring a network failure; it always removes the session cookies), then redirect to `/login`. Expired message: a tab that showed a protected page stores a `sessionStorage` flag; the sign-out button clears it; the sign-in form shows the message once if the flag is there (ADR-17).

**UI.** Sign-in page: centered card on `bg`, max width 400 px, brand, title, two text fields (`autocomplete="email"` and `"current-password"`), full-width primary button; progress bar on the top edge while pending; `aria-live` region for the pending state and messages. Sidebar footer: theme control, email (one line, ellipsis, `title`), and the "Cerrar sesión" button.

**Planned tests.** Unit: the five domain functions, the data-layer error mapping (invalid credentials, 429, network, timeout with an injected fetch). Browser: every scenario above; protected page with no, tampered and expired cookie; policy on the sign-in page in all its states; keyboard-only flow.

**What the build changed** (decided after the plan was approved):
- `createProxyClient(request)` returns `{ supabase, applyTo }` so a renewed session reaches the page rendered next.
- If the authentication service cannot be reached, the proxy treats the user as signed out (fail closed).
- A Server Action posted to `/login` (header `next-action`) is not redirected by the proxy: the action sends the user Home (FR-12).
- The session cookie is `HttpOnly` (`src/lib/supabase/cookie-options.ts`), since the app uses no Supabase browser client.
- `supabase/config.toml`: `[auth.email] enable_signup` switches the whole email provider, so it is `true`; sign-up stays closed through `[auth] enable_signup = false`.
- `safeReturnPath` also rejects control characters (browsers drop tabs and line breaks inside addresses).
- `button.tsx` got a `ghost` hover and a `ghost-destructive` variant (red on hover) for "Cerrar sesión"; `next.config.ts` hides the dev server badge.
- FR-21 is covered by unit tests (`src/data/sign-out.test.ts`, `src/app/(app)/actions.test.ts`), not by a browser test: the Next server calls Supabase, so Playwright cannot block it (approved by the owner).
- The local stack signs with asymmetric keys (ES256), so a correctly signed expired token cannot be made: the "expired" cookie has a past expiry plus an invalid signature and refresh token.
- The `no-store` browser test runs only in CI (production build): the dev server replaces `Cache-Control` with `no-cache, must-revalidate`.

## Change map
| File | Action | Functions and signatures | Scenarios |
|---|---|---|---|
| `src/domain/auth/normalize-email.ts` (+ test) | create | `normalizeEmail` | The email is normalized |
| `src/domain/auth/validate-sign-in.ts` (+ test) | create | `validateSignIn` | Empty fields are reported before sending; A password is sent exactly as typed |
| `src/domain/auth/sign-in-error.ts` (+ test) | create | `signInErrorMessage` | Wrong credentials show one generic message; Too many attempts show the wait message; An unreachable or slow service shows the connection message |
| `src/domain/auth/safe-return-path.ts` (+ test) | create | `safeReturnPath` | The page asked for is remembered; A return page that is not of this app is ignored |
| `src/domain/auth/access.ts` (+ test) | create | `decideAccess`, `SIGN_IN_PATH` | Without a session a protected page shows the sign-in page; With a session the sign-in page shows Home; The page asked for is remembered |
| `src/domain/auth/session-mark.ts` (+ test) | create | `markSession`, `clearSessionMark`, `consumeSessionMark` | A session that ended shows the expired message on the next action |
| `src/lib/env.ts` (+ test) | create | `requireEnv`, `getSupabaseEnv` | (security) |
| `src/lib/supabase/server.ts`, `proxy.ts`, `fetch-with-timeout.ts`, `cookie-options.ts`, `session-cookies.ts` (+ tests) | create | the two clients, 15 s limit, `HttpOnly` options, session cookie filter | An unreachable or slow service shows the connection message; The session survives closing the browser; Signing out without the service still removes the session from the browser |
| `src/data/auth.ts` (+ tests) | create | `signIn`, `signInWithClient`, `signOut`, `getSignedInUser` | the sign-in scenarios; the sign-out scenarios |
| `src/proxy.ts` (+ test) | modify | session check, access decision, `no-store` | Without a session a protected page shows the sign-in page; With a session the sign-in page shows Home; The back button after signing out does not show protected content |
| `src/app/login/page.tsx`, `sign-in-form.tsx`, `actions.ts` | create | sign-in page, form, `signInAction` | the sign-in scenarios; A form submitted after signing in elsewhere shows Home with the existing session |
| `src/app/(app)/layout.tsx` | modify | second session check, email to the sidebar, session marker | Without a session a protected page shows the sign-in page; The sidebar footer shows the email, the theme control and sign out |
| `src/app/(app)/actions.ts` (+ test) | create | `signOutAction` | Signing out ends the session and shows the sign-in page; Signing out without the service still removes the session from the browser |
| `src/components/ui/text-field.tsx`, `progress-bar.tsx`, `button.tsx` | create / modify | field, progress bar, button variants | A sign-in in progress shows its state; Empty fields are reported before sending |
| `src/components/shell/sidebar.tsx`, `sign-out-button.tsx`, `session-marker.tsx` | modify / create | footer, sign-out form, tab marker | The sidebar footer shows the email, the theme control and sign out; Sign out is available from every protected page; A long email is cut with an ellipsis |
| `supabase/seed.sql`, `supabase/config.toml`, `vitest.config.mts`, `next.config.ts` | modify | two fake users, email provider, `@/` alias, dev badge | (tests and environment) |
| `tests/e2e/access.spec.ts`, `security.spec.ts`, `keyboard.spec.ts`, `auth.setup.ts`, `support/*`, `playwright.config.ts` | create / modify | browser tests, saved session | all |
| `docs/architecture.md` | modify | ADR-17 (expired-session message) | - |

## Slices
- [x] **S1. Sign-in rules.** Scenarios: Empty fields are reported before sending; Wrong credentials show one generic message; Too many attempts show the wait message; An unreachable or slow service shows the connection message; The email is normalized; A password is sent exactly as typed. Files: `normalize-email.ts`, `validate-sign-in.ts`, `sign-in-error.ts`.
  - Done when: unit tests green (spaces and capitals, a password of spaces is not empty, exact Spanish messages).
- [x] **S2. Access rules.** Scenarios: Without a session a protected page shows the sign-in page; With a session the sign-in page shows Home; The page asked for is remembered; A return page that is not of this app is ignored. Files: `safe-return-path.ts`, `access.ts`.
  - Done when: unit tests green for the full matrix and for malicious return paths.
- [x] **S3. Supabase clients and auth data layer.** Scenarios: the sign-in failure scenarios; The session survives closing the browser; Signing out without the service still removes the session from the browser. Files: `env.ts`, `src/lib/supabase/*`, `src/data/auth.ts`.
  - Done when: unit tests of the error mapping green (invalid credentials, 429, network, timeout with an injected fetch); `getSignedInUser` returns null without a session against the local stack.
- [x] **S4. Session gate.** Scenarios: Without a session a protected page shows the sign-in page; With a session the sign-in page shows Home; The back button after signing out does not show protected content. Files: `src/proxy.ts`, `(app)/layout.tsx`.
  - Done when: without a session `/` and `/cualquier-cosa` redirect to `/login?next=…`; protected answers carry `no-store`; the policy of 001 is still present.
- [x] **S5. Sign-in page and action.** Scenarios: the sign-in scenarios; A form submitted after signing in elsewhere shows Home with the existing session. Files: `text-field.tsx`, `progress-bar.tsx`, `src/app/login/*`.
  - Done when: a local test user can sign in and lands on Home or on the `next` page; the failure, empty and pending states behave as the scenarios say; a stale form with a session lands on Home.
- [x] **S6. Sign out and expired-session message.** Scenarios: Signing out ends the session and shows the sign-in page; A session that ended shows the expired message on the next action; The sidebar footer shows the email, the theme control and sign out; A long email is cut with an ellipsis. Files: `(app)/actions.ts`, `sign-out-button.tsx`, `session-marker.tsx`, `sidebar.tsx`, ADR-17.
  - Done when: signing out lands on the sign-in page and the back button does not show Home; signing out in one tab shows the message in the other and not in the first; the sidebar shows the email cut with "…" and full in `title`.
- [x] **S7. Test users and access browser tests.** Scenarios: all of the sign-in, session and sign-out scenarios. Files: `supabase/seed.sql`, `tests/e2e/access.spec.ts`, `auth.setup.ts`.
  - Done when: `npm run db:reset` creates the users and `npm run test:e2e` is green for every access flow.
- [x] **S8. Security and accessibility tests, visual check.** Scenarios: (security), (accessibility), The sign-in page offers email, password and a button, and nothing else; A sign-in in progress shows its state; The sidebar footer shows the email, the theme control and sign out. Files: `tests/e2e/security.spec.ts`, `keyboard.spec.ts`.
  - Done when: all tests green, zero console errors and policy violations, and the sign-in page in all its states plus the sidebar footer match `docs/design.md` in both themes.

## Data
None: no tables, no migrations. The session is the Supabase auth cookies managed by `@supabase/ssr`. `supabase/seed.sql` creates two fake local users (`a@example.test`, `b@example.test`) for the browser tests, only in the local database; fake data only (principle 5).

## Decisions
| Decision | Discarded alternative | Reason |
|---|---|---|
| One gate in `proxy.ts` plus a second check in the `(app)` layout | Only the proxy, or only each page | The proxy covers every path, including unknown ones; the layout check is defence in depth if the matcher is ever wrong. |
| `getClaims()` to check the session | `getSession()` (does not verify); `getUser()` (a network call per request) | Verifies signature and expiry, so tampered and expired cookies fail, without a request per page. |
| Sign in and sign out as Server Actions with a plain `<form>` | Calling Supabase from the browser (legacy) | The password goes in a POST body to our server, never in the URL; the "form after signing in elsewhere" scenario can be checked on the server; no browser client needed. |
| Expired-session message from a per-tab `sessionStorage` flag (ADR-17) | A long-lived cookie marker | A cookie is shared by all tabs and survives signing out, so it cannot tell "this tab signed out" from "the session ended under this tab". |
| `HttpOnly` session cookie | The `@supabase/ssr` default (readable by JavaScript) | The app uses no browser client, so nothing needs to read it; a script injected into the page cannot take it. |
| Browser tests sign in once and save the session | Signing in through the form in every test | The local auth service allows 30 sign-ins per 5 minutes per IP. Tests that sign out use another user in their own context. |
| Browser tests for every flow | Manual browser checks only | Most scenarios are flows across pages; principle 4 and ADR-08. |

## Risks
- **Next 16 APIs differ from training data** (`proxy.ts`, cookies, Server Actions). Mitigation: read the bundled guide before each file.
- **Refresh token races between tabs** (documented in `@supabase/ssr`): two tabs refreshing at once can drop one request to "no session". Mitigation: the proxy refreshes once per navigation; the expired-session scenario already defines the outcome as "sign in again".
- **Two layers hide each other's failure** (the page and the action both clean `next`; the proxy and the layout both check the session). Mitigation: a test that skips the first layer (the hand-edited hidden field).
