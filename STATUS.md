# Project status

Last updated: 2026-10-06

## Status
- Project phase: development
- Active spec: 001-app-shell
- Next step: `/sdd-implement 001` (T2)

## Specs
| NNN | Name | Status | Tasks |
|---|---|---|---|
| 001 | app-shell | approved | 1/8 |
| 002 | access | approved | 0/8 (owner implements it with the learn-* commands) |

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

## Blockers
- `gh` is not installed: PRs are opened by the owner from the GitHub compare link.

## Notes for the next session
- Backlog impacts are `[PENDING]` on purpose: they are proposed and reviewed when choosing the first spec, after the project phases.
- `legacy/SESSION-CONTEXT.md` (export of the session that built legacy, in Spanish) is a reference at the same level as `legacy/`. Carry its security lessons (section 8) into `/sdd-constitution` and `/sdd-architecture`, and its testing pain (no automated tests, bugs only found in the browser) into the test strategy.
- `legacy/CLAUDE.md` documents the old app: stack, invoice lifecycle (Spanish fiscal numbering), bank statement import, known pitfalls. Main reference for each spec's scope; decisions are still made per spec.
- Local Supabase runs a minimal stack (ADR-14). Studio, on demand with `npm run db:studio`, needs the repo path shared in Docker Desktop.
- Storage is disabled in `supabase/config.toml`: re-enable it in the invoice spec (logo).
- The old app still runs from `legacy/` (`cd legacy && npm run dev`); its `node_modules` and `.env.local` were moved there locally.
