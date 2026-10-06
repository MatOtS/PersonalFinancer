# Deploy

Not started: completed in `/sdd-deploy`. The rules below were decided early, together with the architecture, because the repository is public.

## CI rules (decided 2026-10-06)
- CI runs on `pull_request`, never on `pull_request_target` when secrets are involved: with `pull_request`, GitHub does not pass secrets to PRs from forks.
- CI needs no production secrets: tests run against a local Supabase stack started inside the job, with fake data.
- Workflow permissions default to read-only (`permissions: contents: read`); anything more is granted per job and justified.
- Third-party actions are pinned to a full commit SHA, not a tag.
- Migrations are never applied to production from CI; `supabase db push` stays a manual step by the maintainer after merging.
- Changes to `.github/workflows/` in an outside PR are reviewed with the same care as migrations.
