# Architecture

Last updated: 2026-10-05

Versions checked against the npm registry on 2026-10-05. Context7 was not available; Next.js guides were read from the package's bundled docs (`node_modules/next/dist/docs/`).

## Stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js LTS | 22.x |
| Framework | Next.js (App Router) + React | 16.3.x / 19.x |
| Language | TypeScript | 5.x (see ADR-09) |
| Database, auth, storage | Supabase (Postgres + Auth + RLS + Storage) | supabase-js 2.x, @supabase/ssr 0.12.x |
| Local database and migrations | Supabase CLI (Docker) | 2.x |
| Styles | Tailwind CSS with the tokens from `docs/design.md` | 4.x |
| Accessible primitives | Base UI (only dialogs, menus, selects, popovers, tooltips) | 1.x |
| Icons | Phosphor Icons, regular (outline) weight | 2.x |
| Font | Manrope, self-hosted through `next/font` | |
| Validation at boundaries | Zod | 4.x |
| Unit tests | Vitest | 5.x |
| Database tests | pgTAP through `supabase test db` | |
| Browser tests | Playwright | 1.x |
| Lint and format | ESLint (`eslint-config-next`) + Prettier | |
| Hosting | Vercel Hobby (app) + Supabase Free (database) | 0 € |

**Why**: same family as legacy, so `legacy/` and `legacy/SESSION-CONTEXT.md` stay directly usable as reference. What changes is how it is used: generated types, migrations applied by a tool, business rules in TypeScript, and three levels of tests. Every row is justified in an ADR below.

**Discarded alternatives** (see ADR-01 and ADR-02):
- Vite + React SPA with Supabase: fewer pieces, but no server for PDF generation, nonce-based CSP or protected routes.
- Own Postgres + an auth library (Auth.js, Lucia...): more control, but isolation, auth and storage would have to be built and maintained by hand.

**Deferred to the spec that needs them** (each one gets its own ADR then): chart library, PDF generation, spreadsheet parsing (legacy has its own .xls/.xlsx readers), CSP details.

## Folder structure

```
.
├── src/
│   ├── app/                  Routes only (App Router): pages, layouts, Server Actions
│   ├── components/
│   │   ├── ui/               Design system components (button, input, card...)
│   │   └── <feature>/        Components of one feature
│   ├── domain/               Pure business rules, no React, no Supabase. Tests next to each file (*.test.ts)
│   ├── data/                 The only code that talks to the database: queries and mutations
│   ├── lib/
│   │   ├── supabase/         Server and browser clients, generated database types
│   │   └── format.ts         Spanish formats (1.234,56 €, dd/mm/yyyy)
│   └── proxy.ts              Session guard and security headers (replaces middleware.ts in Next 16)
├── supabase/
│   ├── config.toml           Local stack configuration (sign-up disabled)
│   ├── migrations/           Versioned SQL, applied by the CLI
│   ├── tests/                pgTAP tests: RLS isolation per table
│   └── seed.sql              Fake development data only
├── tests/e2e/                Playwright browser tests
├── docs/  specs/  prototype/ SDD documents and the design prototype
└── legacy/                   Previous app, read-only reference (excluded from lint, types and build)
```

Dependency direction: `app` → `components` → `domain`; `app` → `data` → `lib/supabase`. `domain` imports nothing from the other folders.

## Initial data model

A map, not a commitment: each table is created by the migration of the spec that needs it, and its columns are decided there.

| Entity | Purpose | Key relations | Spec (candidate) |
|---|---|---|---|
| `profiles` | Per-user settings: fiscal data, VAT and IRPF defaults, invoice number format | 1:1 `auth.users` | Access, Invoice issuing |
| `accounts` | Bank accounts and cash | user | Accounts and categories |
| `categories` | Expense and income categories, one level of subcategories through `parent_id` | user, self | Accounts and categories |
| `movements` | Every income or expense | user, account, category, optional invoice | Quick entry, Import |
| `import_profiles` | Column mapping remembered per bank | user | Import |
| `categorization_rules` | Keyword → category | user, category | Categorization rules |
| `fixed_expenses` | Recurring expenses and their frequency | user, account, category | Fixed expenses |
| `clients` | Invoice recipients and their fiscal data | user | Clients |
| `invoices` | Header, status (`draft`, `issued`, `paid`), number assigned on issue | user, client | Invoice issuing |
| `invoice_lines` | Concept, quantity, price, taxes | invoice (same user) | Invoice issuing |

Rules for every table:
- `user_id uuid not null references auth.users default auth.uid()`.
- RLS enabled with `using` **and** `with check` on `user_id = auth.uid()`; child tables also check that the parent belongs to the same user.
- Money as integer cents (`bigint`, ADR-06). Dates as `date`; the time zone is Europe/Madrid.
- Views always `security_invoker = on`. No `security definer` function without an ADR.

## Authentication and permissions

- Supabase Auth with email and password. **Sign-up is closed**: disabled in Supabase and in `config.toml`; accounts are created by the maintainer from the Supabase dashboard or the CLI. The login screen has no "create account" link.
- Sessions in cookies through `@supabase/ssr`. `src/proxy.ts` redirects to `/login` without a session; this is convenience, not security.
- **Security lives in the database**: RLS on every table, proven by pgTAP tests that log in as user A and try to read and write user B's rows. Nothing in the app filters by user "just in case" as its only barrier.
- One role for now (owner of their data). Multi-user later needs no model change: everything already belongs to a user.

## External services and environment variables

| Service | Use | Plan |
|---|---|---|
| Supabase | Database, auth, storage (invoice logo) | Free, reusing the legacy project with its schema dropped |
| Vercel | Hosting of the Next.js app | Hobby (personal, non-commercial use) |

Environment variables (names only):

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App (local `.env.local`, Vercel) | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App (local `.env.local`, Vercel) | Public key, safe in the browser because RLS protects the data |
| `SUPABASE_ACCESS_TOKEN` | Maintainer's machine only | For `supabase link` and `db push`; never in the app or the repo |
| `SUPABASE_DB_PASSWORD` | Maintainer's machine only | Same |

No service-role key in the app.

## Collaboration and public repository

The repository is public (portfolio). Nobody can write to it without the maintainer's permission: outside contributors fork it and open PRs. The production database is never exposed by the repo, because its admin credentials (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) only live on the maintainer's machine, and the public URL and publishable key are public by design (protected by RLS and closed sign-up).

Rules for every outside PR:
1. **Migrations are reviewed line by line.** Reject any change that disables RLS, weakens a policy, adds `security definer` without an ADR or grants privileges to `anon`. `db push` only after the PR is merged.
2. **Never run outside code with real credentials.** Read the whole diff first, especially `package.json` scripts, config files and anything executed at install or build. Run it, if needed, without `.env.local` and with the local database only.
3. **Contributors use their own local stack** (`npm run db:start`) with fake data from `seed.sql`. They never get access to the production project.

Settings the maintainer keeps on GitHub and Vercel (not in the repo):
- Branch protection on `main`: PR required, no force pushes, no deletion.
- Vercel Git Fork Protection on, so PRs from forks are not deployed with the project's environment variables without approval.

CI rules are in `docs/deploy.md`.

## Commands

| Purpose | Command |
|---|---|
| Development | `npm run dev` (needs `npm run db:start` first) |
| Local database | `npm run db:start`, `npm run db:stop`, `npm run db:reset` (reapply migrations + seed) |
| Generate DB types | `npm run db:types` |
| Unit tests | `npm test` (Vitest) |
| Database tests | `npm run test:db` (pgTAP, `supabase test db`) |
| Browser tests | `npm run test:e2e` (Playwright) |
| Lint, types, format | `npm run lint`, `npm run typecheck`, `npm run format` |
| Build | `npm run build` |
| Deploy migrations | `npx supabase db push` (maintainer only, after the PR is merged) |

`npm run check` runs lint, typecheck and unit tests together; it is the gate of every task. `test:db` and `test:e2e` join the gate as soon as the first spec adds them.

## ADRs

| # | Decision | Alternatives | Reason |
|---|---|---|---|
| 01 | Next.js App Router | Vite SPA; Remix | Server for PDF, nonce CSP and protected routes; legacy is a direct reference. Next 16 has breaking changes (`proxy.ts` instead of `middleware.ts`): read the bundled docs before using an API. |
| 02 | Supabase | Own Postgres + Auth.js | RLS gives isolation enforced by the database (constitution 5); auth and storage included; free plan; legacy knowledge reused. |
| 03 | Supabase CLI with a local Docker stack; migrations applied by the CLI | Running SQL by hand in the dashboard (legacy) | Reproducible: `db reset` rebuilds the database from the repo; production gets exactly the reviewed migrations. |
| 04 | Database types generated with `supabase gen types` | Hand-written types (legacy) | Legacy's hand-written types collapsed to `never` far from the real error. |
| 05 | Business rules in `src/domain` (TypeScript); the database keeps constraints, RLS and only the functions that must be atomic, each with an ADR | Triggers for totals, flags and side effects (legacy) | One rule, one place, unit tested (constitution 3). Legacy's triggers were the hardest part to understand. |
| 06 | Money as integer cents | `numeric` in the DB and floats in JS | No rounding errors in sums and taxes; simple to test. Formatting to `1.234,56 €` happens only at the edges. |
| 07 | Own components with Tailwind; Base UI only for primitives with complex accessibility | shadcn (copies thousands of lines into the repo) | Every component is written and understood by the maintainer (constitution 1); Base UI covers focus trapping and keyboard handling that are easy to get wrong. |
| 08 | Three test levels: Vitest (domain), pgTAP (RLS), Playwright (browser) | Legacy's mock HTTP server + manual browser runs | Legacy bugs only appeared in the browser and isolation was never tested. Each level checks what the others can't. |
| 09 | TypeScript 5.x | TypeScript 7.0 (latest) | 7.0 is a new native compiler; compatibility with the Next.js 16 toolchain is not confirmed. Revisit when Next supports it officially. |
| 10 | Manrope self-hosted through `next/font` | Loading from Google Fonts at runtime | No request to Google from the user's browser (privacy, simpler CSP). Tabular figures must be verified in the foundation; if Manrope lacks them, change the font. |
| 11 | Prettier | Lint rules only | Consistent formatting makes AI-written code easier to review. |
| 12 | Vercel Hobby + Supabase Free, reusing the legacy project | Supabase Pro; local only | 0 €. Accepted limits: the free project pauses after a week without use and has no downloadable backups. Legacy stops working against it once its schema is dropped (approved). |
| 13 | Sign-up closed, accounts created by the maintainer | Open sign-up; magic link | Private app; no email service needed; the model still supports more users. |
