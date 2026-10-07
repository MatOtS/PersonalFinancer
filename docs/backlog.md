# Backlog

Ordered by build order (dependencies first, then value). Approved by the owner on 2026-10-06.

1. 2026-10-05 | Access and authentication (login, session, app shell: layout, navigation, design tokens, light and dark theme) | Impact: high | Spec: 001-app-shell, 002-access
2. 2026-10-05 | Accounts and categories | Impact: high | Spec: none
3. 2026-10-05 | Quick movement entry | Impact: high | Spec: none
4. 2026-10-05 | Bank statement import | Impact: high | Spec: none
5. 2026-10-05 | Unified dashboard | Impact: high | Spec: none
6. 2026-10-05 | Automatic categorization rules | Impact: medium | Spec: none
7. 2026-10-05 | Fixed expenses | Impact: medium | Spec: none
8. 2026-10-05 | Clients | Impact: medium | Spec: none
9. 2026-10-05 | Invoice issuing | Impact: high | Spec: none
10. 2026-10-05 | Invoice PDF | Impact: high | Spec: none
11. 2026-10-05 | Invoice payment tracking | Impact: medium | Spec: none
12. 2026-10-05 | Tax reserve (VAT and IRPF) | Impact: medium | Spec: none
13. 2026-10-05 | Automatic bank connection through a PSD2 aggregator (e.g. GoCardless, Enable Banking) to fetch movements without manual statement imports. Requires prior research and evaluation: security, cost, 90 day consent renewal, coverage of the owner's banks | Impact: high | Spec: none
14. 2026-10-05 | Phase 2: mobile experience (responsive layouts, bottom navigation, quick entry on mobile, 375 px verification) | Impact: medium | Spec: none
15. 2026-10-05 | Phase 2: PWA (installable on the home screen, full screen) | Impact: low | Spec: none
16. 2026-10-07 | Show the user's name instead of the email in the sidebar once the name is filled in the settings (needs a settings or profile spec with a name field) | Impact: low | Spec: none
17. 2026-10-07 | Maximum session lifetime: even without signing out, the session expires after 30 days and asks to sign in again (security if someone else uses the computer). Changes FR-11 of spec 001 | Impact: low | Spec: none
18. 2026-10-07 | Password rules when passwords are created or changed from the app (future: sign-up, password change or reset): leading and trailing spaces are trimmed and spaces in the middle are not allowed. Sign-in keeps sending the password exactly as typed (spec 001) | Impact: low | Spec: none
