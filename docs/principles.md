# Constitution: PersonalFinancer

Non-negotiable principles. Every spec, plan and task must follow them.

1. **Stack simplicity**: code a junior developer can read and explain. Every dependency is justified in an ADR; prefer the platform and explicit code over magic. Prepare for growth only where a spec foresees it; otherwise build the minimum.
2. **The spec rules**: nothing is implemented unless it is in an approved spec. If a decision is missing, stop and ask.
3. **Logic separated from UI**: business rules (amounts, taxes, invoice numbering, statement parsing) are pure functions in their own module, each rule in exactly one place. Components only render and call them; only the data layer talks to the database.
4. **Tests as a gate**: `npm run check` (lint, types, unit tests), plus `npm run test:db` and `npm run test:e2e` once they exist. Every business rule has unit tests; UI requirements are verified in the browser at 1280 px, light and dark (375 px from phase 2). Moving forward with red tests is forbidden.
5. **User data is sacred**: every record belongs to a user and isolation is enforced by the database, with a test proving a user cannot read or write another user's data. No real financial data in the repo, tests or logs; bank files are parsed without being stored. Schema changes only through versioned migrations.
6. **Language**: code, docs, branches and commits in English; UI copy in Spanish (Spain), with `1.234,56 €` and `dd/mm/yyyy` formats.
