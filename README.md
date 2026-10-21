# PersonalFinancer

Private web app to manage personal finances and freelance invoicing, for a single user (a self-employed freelancer in Spain). It brings bank accounts, movements and invoices together in one place.

**Status:** phase 1 (desktop web) in development. Done: app shell with light and dark themes (spec 001). Next: sign-in and sessions (spec 002). The UI is in Spanish.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, RLS), Vitest and Playwright.

## Requirements
- Node.js 22.12 or newer
- Docker running (only for the local database)

## Install and run
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

The app does not use the database yet, so `npm run dev` is enough for now. From spec 002 on, start the local database first and copy the URL and key it prints into `.env.local`:
```bash
npm run db:start
```
It uses fake data only. `npm run db:stop` stops it.

## Useful commands
| Command | What it does |
|---|---|
| `npm run check` | Lint, types, format and unit tests |
| `npm run test:e2e` | Browser tests with Playwright (see `PLAYWRIGHT_BROWSER_PATH` in `.env.example` to use an installed Chromium-based browser instead of downloading one) |
| `npm run build` | Production build |

## Documentation
The project follows Spec-Driven Development: nothing is built unless it is in an approved spec.
- `docs/`: discovery, constitution, design, architecture (with its decision records) and backlog.
- `specs/`: one folder per feature with its spec, plan and tasks.
- `STATUS.md`: where the project is and the next step.
- `legacy/`: the previous version of the app, kept as read-only reference.

## Contributing
The repository is public. Outside contributions go through a fork and a pull request; the rules are in "Collaboration and public repository" in `docs/architecture.md`. Never commit real financial data or credentials.
