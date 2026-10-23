# Project status

Last updated: 2026-10-22

## Status
- Project phase: development
- Active spec: 002-access
- Next step: `/sdd-implement 002` (T6)

## Workflow
- Ownership: own
- Mode: manual
- SDD files: tracked
- Learning: off
- Framework: Artificer v0.1

## Specs
| NNN | Name | Status | Tasks |
|---|---|---|---|
| 001 | app-shell | implemented | 8/8 |
| 002 | access | approved | 5/8 |

## Key decisions
- 2026-10-05 Rebuild from scratch in the same repo. Project phases are decided from zero, not documented from the old code (treated as a **new** project).
- 2026-10-05 The previous app lives in `legacy/` as read-only reference. It is not modified and nothing is copied from it without going through a spec.
- 2026-10-05 No real data to preserve: the old Supabase only has test data, so the new data model is designed freely.
- 2026-10-05 `legacy/` defines the target scope: the new app replicates it, with every piece decided and approved by the owner through specs.
- 2026-10-05 Single user today, but nothing may rule out multi-user later: all data belongs to a user from day one.
- 2026-10-05 Bank movements enter by statement import for now. Automatic PSD2 connection goes to the backlog, pending research.
- 2026-10-05 Discovery approved by the owner (`docs/discovery.md`).
- 2026-10-05 Veri*factu stays as a risk to research in the future; it does not block invoicing. Tax reserve (VAT and IRPF) stays as a candidate feature.
- 2026-10-05 Constitution approved (`docs/constitution.md`). Test command pending until architecture.
- 2026-10-05 Maintainer (junior full stack developer, makes the decisions) and end user (the freelancer) are different people; clarified in `docs/discovery.md`.
- 2026-10-05 Visual style based on the owner's dark fintech mockups (style only, no features). Dark first with an equivalent light theme; default follows the system, manual toggle.
- 2026-10-05 Design approved (`docs/design.md`), validated with the static prototype in `prototype/index.html`.
- 2026-10-05 Phase 1 is desktop only (≥ 1024 px). Mobile experience and PWA move to phase 2 (backlog). Discovery, design and constitution updated with owner approval.
- 2026-10-05 Stack: same family as legacy (Next.js, Supabase, Tailwind). Hosting: Vercel Hobby + Supabase Free. Reuse the legacy Supabase project; its schema will be dropped (owner approved: only test data, legacy stops working against it). Auth: email and password, sign-up closed.
- 2026-10-06 Architecture approved (`docs/architecture.md`, 13 ADRs). Repo stays public (portfolio): collaboration rules in `docs/architecture.md`, CI rules in `docs/deploy.md`.
- 2026-10-06 Everything up to architecture ships in the `chore/sdd-setup` PR; the technical foundation (install, linter, test runner) goes in a separate PR after it is merged.
- 2026-10-06 Technical foundation ready: Next 16.3, TypeScript 5.9, Tailwind 4, ESLint 9, Prettier (code only), Vitest 5 with one example test, Supabase CLI with sign-up closed (verified locally). Manrope tabular figures verified.
- 2026-10-06 Backlog ordered with impacts (approved). Spec 001-access may be split in two (app shell / access) if it exceeds 10 tasks (approved).
- 2026-10-07 Spec 001-access approved after clarify (19 points resolved, 32 FRs). Backlog items 16 to 18 added during clarify.
- 2026-10-07 Plan 001 approved (`specs/001-access/plan.md`), including two new dependencies: `@phosphor-icons/react` (ADR-15) and `@playwright/test` (ADR-08). ADR-16 (theme cookie) and ADR-17 (per-tab expired-session flag) to be added to `docs/architecture.md` during implementation.
- 2026-10-07 Spec 001-access split in two, keeping the original FR numbers: `001-app-shell` (8 tasks) and `002-access` (8 tasks, starts after 001 is merged). Branch `feat/001-app-shell` created.
- 2026-10-08 001 T2 implemented by the owner in learn mode (learn-* commands, switched automatically by task state).
- 2026-10-11 001 T3 implemented by the owner in learn mode. Button decisions (ghost color, text on destructive) documented in `docs/design.md`; follow-ups in backlog #19 and #20.
- 2026-10-12 001 T4 implemented by the owner in learn mode. The theme cookie name and lifetime live in `src/domain/theme.ts` (`THEME_COOKIE`, `ONE_YEAR_SECONDS`), shared by the root layout and the theme control.
- 2026-10-12 001 T5 implemented with `/sdd-implement`: `(app)` shell, sidebar, Home, `@phosphor-icons/react` (ADR-15). Theme control pills narrowed (`px-2`) to fit the 240 px sidebar. `npm audit` advisory on the dev tooling chain recorded in backlog #21.
- 2026-10-19 Workflow settings recorded in this file: own, tracked, Learning `assist` (Claude implements at normal speed; the user answers an approach question and 1 to 3 comprehension questions per task). Mode switched to `manual` on 2026-10-19: no branch, commit, push or PR without showing it first and getting an explicit yes.
- 2026-10-20 001 T6 implemented with `/sdd-implement` (learn-assist): `(app)/[...missing]` catch-all plus `(app)/not-found.tsx`. `button.tsx` now exports `buttonClassName` so the "Volver a Inicio" link reuses the button styles. Next renders 404s of dynamic routes as an error shell with the UI in the flight payload (status 404 is correct); see T8 for the browser tests.
- 2026-10-20 001 T7 implemented with `/sdd-implement` (learn-assist): `src/proxy.ts` sets a per-request nonce and the Content-Security-Policy built by `src/lib/security-headers.ts`; `next.config.ts` adds Referrer-Policy, X-Content-Type-Options and Permissions-Policy; ADR-16 documents the theme cookie. Next's dev tools insert `<style>` elements without a nonce, so development (only) also allows `style-src-elem 'self' 'unsafe-inline'`; production is strict and showed zero violations on Home and the 404 (checked on a copy of the project built outside the repo).
- 2026-10-21 001 T8 implemented with `/sdd-implement` (learn-assist): `@playwright/test` (ADR-08), `playwright.config.ts`, `npm run test:e2e` and 20 browser tests in `tests/e2e/` (shell, theme, security). Locally they run against the dev server (reused if running) and can use an installed Chromium-based browser through `PLAYWRIGHT_BROWSER_PATH` in `.env.local` instead of downloading one; CI builds and tests production. Next's dev indicator covers the theme control in development, so the theme tests hide it. Visual check of Home and not-found in light and dark at 1280 px: no deviations.
- 2026-10-21 001 validated: gate green (44 unit, 20 e2e), every FR covered. One finding accepted by the owner and sent to backlog #23 (AA contrast of the active sidebar item in the light theme, 4.4:1). The console criterion of the spec now excepts the 4xx a requirement asks for (the 404 of FR-14). Spec marked `implemented`.
- 2026-10-21 Spec 002 is implemented with `/sdd-implement` in learn-assist mode, like the last tasks of 001 (not by the owner with the learn-* commands). Branch `feat/002-access-sign-in`. T1 done: `normalizeEmail`, `validateSignIn` and `signInErrorMessage` in `src/domain/auth/`.
- 2026-10-21 002 T2 done: `safeReturnPath` and `decideAccess` in `src/domain/auth/`. `safeReturnPath` also rejects control characters (browsers drop tabs and line breaks inside addresses, so `/\t/evil.com` would become `//evil.com`); not in the plan, added as a security hardening of FR-16.
- 2026-10-22 002 T3 done: `src/lib/env.ts`, `src/lib/supabase/{fetch-with-timeout,server,proxy}.ts` (15 s limit) and `src/data/auth.ts` (`signIn`, `signOut`, `getSignedInUser`). Any Supabase failure that is not a clear rejection (429 or 4xx) counts as "unreachable", and `signOut` ends only this browser's session (`scope: "local"`). Vitest gets the same `@/` alias as tsconfig. Fix in `supabase/config.toml`: `[auth.email] enable_signup` switches the whole email provider, so with `false` nobody could sign in (`422 email_provider_disabled`); it is now `true`, and sign-up stays closed through `[auth] enable_signup = false` (checked: sign-up answers `signup_disabled`, sign-in and wrong password behave as expected). `.env.local` holds the local URL and key.
- 2026-10-22 002 T4 done: `src/proxy.ts` now checks the session with `getClaims()`, applies `decideAccess`, redirects to `/login?next=...`, sets `Cache-Control: no-store` on every page except `/login` and keeps the 001 nonce and CSP on all answers (redirects included). If the authentication service cannot be reached the proxy treats the user as signed out (fail closed). `createProxyClient(request)` now returns `{ supabase, applyTo }` so renewed cookies reach the page that renders next and the response (changed from T3). The `(app)` layout re-checks the session with `getSignedInUser()`. `/login` loops to itself until T5 adds the page (it falls into the `(app)` catch-all and the layout redirects), expected.
- 2026-10-23 002 T5 done at Learning `off` (switched from `assist` to try it): `/login` page, `signInAction`, sign-in form (client validation with focus on the first empty field, pending state, `aria-live`), `TextField` and `ProgressBar` (with an `indeterminate` animation in `globals.css`). No automated tests for the flows yet (the plan puts them in T7); checked by hand in the browser with a temporary local user: empty fields, wrong credentials (email kept, password cleared), sign in landing on the `next` page, `/login` with a session going Home, pending state, and a stale form submitted after signing in (FR-12). The last one found a bug: the proxy redirected the form's POST to Home, where the action does not exist, so the page failed; the proxy now lets a Server Action posted to `/login` through (header `next-action`) and the action sends the user Home. Note for T7: cover this with a browser test. The session cookie is now HttpOnly (`src/lib/supabase/cookie-options.ts`, used by both server clients): `@supabase/ssr` leaves it readable by JavaScript by default because its browser client needs that, but this app only signs in and out through server actions, so a script injected into the page can no longer read it (owner approved doing it inside 002; tests in `src/lib/supabase/cookies.test.ts`). Revisit it if a Supabase browser client is ever added.

## Blockers
- `gh` is not installed: PRs are opened by the owner from the GitHub compare link.

## Notes for the next session
- Backlog impacts are `[PENDING]` on purpose: they are proposed and reviewed when choosing the first spec, after the project phases.
- `legacy/SESSION-CONTEXT.md` (export of the session that built legacy, in Spanish) is a reference at the same level as `legacy/`. Carry its security lessons (section 8) into `/sdd-constitution` and `/sdd-architecture`, and its testing pain (no automated tests, bugs only found in the browser) into the test strategy.
- `legacy/CLAUDE.md` documents the old app: stack, invoice lifecycle (Spanish fiscal numbering), bank statement import, known pitfalls. Main reference for each spec's scope; decisions are still made per spec.
- Local Supabase runs a minimal stack (ADR-14). Studio, on demand with `npm run db:studio`, needs the repo path shared in Docker Desktop.
- Storage is disabled in `supabase/config.toml`: re-enable it in the invoice spec (logo).
- The old app still runs from `legacy/` (`cd legacy && npm run dev`); its `node_modules` and `.env.local` were moved there locally.
