# Deploy

First production deploy done 2026-11-19 (owner). The CI rules below were decided early, together with the architecture, because the repository is public.

## Production setup (2026-11-19)
- **Hosting:** Vercel Hobby, project connected to `MatOtS/PersonalFinancer`, Production Branch `main`, Root Directory the repository root (the previous app lives in `legacy/` and is not deployed), preset Next.js.
- **Environment variables (Production), only these two:** `NEXT_PUBLIC_SUPABASE_URL` (Project URL of the remote project) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_...` key, public by design: RLS protects the data). Never the secret or `service_role` keys, and never the values of `.env.local` (they point to the local stack). `NEXT_PUBLIC_` variables are fixed at build time: change one, redeploy.
- **Database:** the remote project had the previous app's schema, created by hand. It was reset with the repository migrations: `npx supabase link --project-ref <ref>` and `npx supabase db reset --linked --no-seed` (approved by the owner, ADR-12). `--no-seed` is mandatory: the seed creates fake users with public passwords. After that, new migrations go with `npx supabase db push` (check first with `--dry-run`), by the maintainer, after the PR is merged.
- **Storage:** private bucket `branding` created by hand in the dashboard (png and jpeg, 512 KiB). The migrations create its policies, not the bucket.
- **Auth:** sign-up closed. The two accounts were created in the dashboard (Authentication, Users, Add user, Auto Confirm User). Site URL and Redirect URLs are the Vercel domain.
- **Smoke test:** sign in, Home, sign out, on production, done by the owner.

## Known limits
- Free Supabase project: pauses after a week without use and has no downloadable backups (ADR-12).
- `legacy/` stays in the repository as read-only reference; Vercel must keep deploying the root.


## CI rules (decided 2026-10-06)
- CI runs on `pull_request`, never on `pull_request_target` when secrets are involved: with `pull_request`, GitHub does not pass secrets to PRs from forks.
- CI needs no production secrets: tests run against a local Supabase stack started inside the job, with fake data.
- Workflow permissions default to read-only (`permissions: contents: read`); anything more is granted per job and justified.
- Third-party actions are pinned to a full commit SHA, not a tag.
- Migrations are never applied to production from CI; `supabase db push` stays a manual step by the maintainer after merging.
- Changes to `.github/workflows/` in an outside PR are reviewed with the same care as migrations.
