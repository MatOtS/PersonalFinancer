# PersonalFinancer

Private web app to manage personal finances and freelance invoicing, for a single user.

## Stack
Next.js 16 (App Router) + React 19, TypeScript 5, Supabase (Postgres, Auth, RLS, Storage) with a local stack through the Supabase CLI, Tailwind CSS 4, Base UI for complex accessible primitives, Vitest + pgTAP + Playwright. Hosting: Vercel Hobby + Supabase Free. Details and ADRs in `docs/architecture.md`.

Next.js 16 has breaking changes (for example `src/proxy.ts` instead of `middleware.ts`): read the guide in `node_modules/next/dist/docs/` before using any Next API. The block at the end of this file is managed by `next dev`; keep it as is.

## Commands
- Development: `npm run db:start` (needs Docker running), then `npm run dev`. Supabase Studio needs the repo path shared in Docker Desktop (Settings → Resources → File sharing); without it, start with `npx supabase start -x studio`
- Tests: `npm run check` (lint, typecheck, format, unit tests); `npm run test:db` (pgTAP, needs the local database); `npm run test:e2e` once Playwright is added
- Linter: `npm run lint`, `npm run format` (Prettier, code only: Markdown is excluded)
- Build: `npm run build`
- Database: `npm run db:reset` (reapply migrations and seed), `npm run db:types` (regenerate types after every migration)

## Verification
- After every change, run `npm run check`.
- Visual changes: verify with the Chrome DevTools MCP at 1280 px, light and dark, and check the console. 375 px from phase 2.

## Rules
- Read `STATUS.md`, `docs/constitution.md` and the active spec before touching code.
- Follow the `sdd` skill.
- `legacy/` is the previous app, kept as read-only reference. Never modify it, and never copy code from it unless an approved spec or plan says so.
- `legacy/SESSION-CONTEXT.md` is the export of the session that built the previous app: decisions, security fixes and pitfalls. Read it, together with the relevant `legacy/` code, when writing each spec and plan.
- The repository is public: follow the collaboration rules in `docs/architecture.md`. Never commit real financial data, credentials or personal data.

## Conventions
- Folders: `src/app` routes only; `src/domain` pure business rules with tests next to them; `src/data` the only code that talks to the database; `src/components/ui` design system. `domain` imports nothing from the other folders.
- Money as integer cents everywhere; format to `1.234,56 €` only at the edges.
- Every table: `user_id`, RLS with `using` and `with check`, a pgTAP isolation test. Views with `security_invoker = on`. No `security definer` without an ADR.
- Schema changes: new migration in `supabase/migrations/`, then `npm run db:types`. Never edit an applied migration.
- Components use design tokens from `docs/design.md`, never raw colors.
- Every new dependency needs an ADR in `docs/architecture.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
