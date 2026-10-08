# Tasks 002: Access and session

Requires `001-app-shell` merged into `main`.

- [ ] **T1. Sign-in rules.** FR-3, FR-4, FR-5, FR-9, edge cases
  - `normalizeEmail`, `validateSignIn`, `signInErrorMessage` with unit tests.
  - Done when: unit tests green, covering spaces and capitals in the email, a password of spaces counted as not empty, and the exact Spanish messages.
- [ ] **T2. Access rules.** FR-10, FR-11, FR-13, FR-15, FR-16
  - `safeReturnPath` and `decideAccess` with unit tests.
  - Done when: unit tests green for the full matrix (sign-in page, protected page, unknown page × with and without session) and for malicious return paths (`//evil.com`, `/\evil.com`, `https://evil.com`, `/login`).
- [ ] **T3. Supabase clients and auth data layer.** FR-2 to FR-5, FR-17, FR-20, FR-21
  - `src/lib/env.ts`, `src/lib/supabase/server.ts` and `proxy.ts` (15 s timeout), `src/data/auth.ts` (`signIn`, `signOut`, `getSignedInUser`, error mapping); `.env.local` from the local stack.
  - Done when: unit tests of the error mapping green (invalid credentials, 429, network error, timeout with an injected fetch); `getSignedInUser` returns null without a session against the local stack.
- [ ] **T4. Session gate.** FR-10, FR-11, FR-13, FR-15, FR-17, FR-22, NFR security
  - Session refresh and `decideAccess` in `src/proxy.ts`, `Cache-Control: no-store` on protected pages, second check in the `(app)` layout.
  - Done when: without a session, `/` and `/cualquier-cosa` redirect to `/login?next=…`; responses of protected pages carry `no-store`; the CSP from 001 is still present.
- [ ] **T5. Sign-in page and action.** FR-1 to FR-9, FR-12, FR-16
  - Text field and progress bar components; `/login` page, sign-in form (client validation, pending state, `aria-live`), `signInAction`.
  - Done when: a local test user can sign in and lands on Home or on the `next` page; wrong credentials, empty fields and pending state behave as the FRs say; a stale form submitted with a session lands on Home.
- [ ] **T6. Sign out and expired-session message.** FR-18 to FR-21, FR-26
  - `signOutAction` (cookies always removed), sign-out button, per-tab session marker and expired message (ADR-17 in `docs/architecture.md`), email in the sidebar footer.
  - Done when: signing out lands on the sign-in page and the back button does not show Home; signing out in one tab shows the expired message in the other on its next action and not in the tab that signed out; the sidebar shows the email cut with "…" and full in `title`.
- [ ] **T7. Test users and access browser tests.** FR-1 to FR-13, FR-15 to FR-22, FR-26
  - Two fake users in `supabase/seed.sql`; `tests/e2e/access.spec.ts` as listed in the plan.
  - Done when: `npm run db:reset` creates the users and `npm run test:e2e` is green for every access flow.
- [ ] **T8. Security and accessibility tests, visual check.** NFR security, NFR accessibility, FR-1, FR-7, FR-26
  - `tests/e2e/security.spec.ts` (no cookie, tampered cookie, expired cookie, CSP on the sign-in page), keyboard-only flow; visual check with the Chrome DevTools MCP at 1280 px in light and dark.
  - Done when: all tests green, zero console errors and CSP violations, and the sign-in page in all its states plus the sidebar footer match `docs/design.md` in both themes.

Rules: 20 to 30 min max per task, in dependency order, 10 tasks max. Every FR covered by at least one task.
