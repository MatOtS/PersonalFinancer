# Discovery

Last updated: 2026-10-05

## Problem
Personal finances and freelance income live in separate places: each bank's app shows only its own account, and a hand-kept spreadsheet tries to tie everything together. There is no single, up to date view of how much money there is, where it goes and how much the freelance work really leaves after taxes.

## Target user and context
- A single user: a self-employed freelancer (autónomo) in Spain, with several bank accounts and cash.
- The app is built and maintained by a different person: a junior full stack developer, who makes the product and technical decisions.
- Desktop for management sessions, weekly or monthly: import statements, issue invoices, review the summary.
- Mobile only for quick actions: log an expense on the spot or look something up. **Phase 2**: phase 1 delivers the desktop web app only.
- Personal use today. Multi-user is not planned, but no decision should rule it out: the door stays open for a hypothetical future with more users.

## Value proposition
One private place where personal finances and freelance invoicing come together, so the full financial picture is always clear.

## Current alternatives and where they fail
| Alternative | Used today | Where it fails |
|---|---|---|
| Own spreadsheet | Yes | Everything is typed by hand, error-prone, falls out of date, no link between invoices and money received. |
| Each bank's app | Yes | Fragmented view, one account at a time; no categories across banks; no freelance perspective. |
| Invoicing software (Holded, Quipu...) | No | Paid, focused on the business only; doesn't cover personal finances. |
| The previous version of this app (`legacy/`) | Built | Its scope is the right one, but it was written by AI with almost no human control: the owner did not decide each piece and doesn't know it in depth. |

## Hypotheses to validate
1. A unified view replaces the spreadsheet: after one month of use, the spreadsheet is no longer needed.
2. Importing bank statements weekly or monthly is a discipline the owner can keep, so the data stays up to date.
3. (Phase 2) Logging an expense from the mobile takes under 15 seconds, so it is actually used on the spot.
4. Issuing invoices in the app is simpler than the current process and links each invoice to the money received.
5. Knowing how much to reserve for VAT and IRPF is part of the value of the unified view.

## Main risks
- **Closing the multi-user door**: single-user shortcuts (hardcoded owner, data without an owner) would make a future multi-user version a rewrite. Mitigation: every piece of data belongs to a user from day one.
- **Repeating the past**: rebuilding the same broad scope too fast and losing control again. Mitigation: small specs, one at a time, each approved by the owner.
- **Stale data**: if statement imports are skipped, the unified view stops being useful.
- **Fiscal compliance**: Spanish invoicing rules (correlative numbering, required invoice data) and the upcoming Veri*factu regulation for invoicing software may apply to self-made invoicing, even in a private app. Accepted as a risk to research in the future; it does not block the invoicing spec.
- **Statement formats**: each bank exports a different format (CSV, XLS, XLSX, extra header rows), and banks change formats without notice.
- **Financial data security**: sensitive personal data, even if only for one user.

## References
- `legacy/`: the previous app, the functional model to rebuild. Seven screens: Home dashboard, Freelance dashboard, Invoices (list and new), Quick entry, Import, Settings, Login.
- `legacy/SESSION-CONTEXT.md`: export of the session that built it. Key inputs for later phases:
  - Statement import already validated against real exports from four different banks (two CSV, one .xlsx, one .xls), parsed in the browser without storing the original file.
  - Spanish invoice lifecycle: draft, issued, paid; the correlative number is assigned when issuing, never on creation.
  - Security lessons (data isolation between users, XSS, CSP) that the constitution and architecture must carry over.
  - Pending in legacy, never started: mobile-first pass (tables as cards on small screens, 44 px touch targets).

## Candidate features
Titles only; each one will be a spec.

### Implemented
None yet. The previous app in `legacy/` is the functional model to rebuild: same scope, but every piece goes through a spec the owner decides and approves.

### Candidates
1. Access and authentication
2. Accounts and categories
3. Quick movement entry
4. Bank statement import
5. Automatic categorization rules
6. Unified dashboard
7. Fixed expenses
8. Clients
9. Invoice issuing
10. Invoice PDF
11. Invoice payment tracking
12. Tax reserve (VAT and IRPF)

### Future
- Automatic bank connection (PSD2 aggregator), after research. See `docs/backlog.md`.
- Multi-user, only as a hypothetical future. Not planned.
- Phase 2: mobile experience (responsive layouts, bottom navigation, quick entry on mobile) and PWA.
