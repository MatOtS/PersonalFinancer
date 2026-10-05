# Project status

Last updated: 2026-10-05

## Status
- Project phase: setup
- Active spec: none
- Next step: `/sdd-discovery`

## Specs
| NNN | Name | Status | Tasks |
|---|---|---|---|

## Key decisions
- 2026-10-05 Rebuild from scratch in the same repo. Project phases are decided from zero, not documented from the old code (treated as a **new** project).
- 2026-10-05 The previous app lives in `legacy/` as read-only reference. It is not modified and nothing is copied from it without going through a spec.
- 2026-10-05 No real data to preserve: the old Supabase only has test data, so the new data model is designed freely.

## Blockers
- None

## Notes for the next session
- `legacy/CLAUDE.md` documents the old app: stack, invoice lifecycle (Spanish fiscal numbering), bank statement import, known pitfalls. Useful input for discovery, but not a decision.
- The old app still runs from `legacy/` (`cd legacy && npm run dev`); its `node_modules` and `.env.local` were moved there locally.
