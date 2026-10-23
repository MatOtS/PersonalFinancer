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
19. 2026-10-11 | DONE 2026-10-23 (002 T6, `accent-soft` on hover, in `docs/design.md`): Button `ghost` variant: define a hover (and focus) state so it is recognized as a button and not mistaken for plain text, e.g. an `accent-soft` background on hover. Gap noted in `docs/design.md` (Buttons) during 001 T3 | Impact: low | Spec: none
20. 2026-10-11 | Components: a `className` passed from outside cannot reliably override a conflicting Tailwind class of the component (e.g. `bg-negative` on a `primary` button keeps both; CSS order decides, not class order). For now the rule is "`className` positions, it does not recolor". If overriding styles becomes necessary, evaluate `tailwind-merge` (new dependency, needs an ADR). Noted in 001 T3 review | Impact: low | Spec: none
21. 2026-10-12 | `npm audit` reports 5 high severity advisories in the dev tooling chain `braces` > `micromatch` > `fast-glob` > `@next/eslint-plugin-next` > `eslint-config-next` (stack exhaustion with deeply nested patterns). Dev only: it runs on our own files when linting and never reaches production. Not caused by Phosphor. `npm audit fix --force` would downgrade `eslint-config-next` to 14, so do NOT apply it; re-check after the next `eslint-config-next` / `next` update | Impact: low | Spec: none
22. 2026-10-12 | Make the gate catch deprecated APIs: enable the ESLint rule `@typescript-eslint/no-deprecated` (needs type-aware linting in `eslint.config.mjs`; no new dependency). Found in 001 T5: deprecated Phosphor icon names passed `npm run check` because TypeScript only reports "deprecated" as a hint, not an error | Impact: low | Spec: none
23. 2026-10-21 | Contrast AA of the active sidebar item in the light theme: `accent` (`#087F5B`) on `accent-soft` over `surface` is 4.4:1 and AA asks 4.5:1 for text. Options: darken `accent` in light (e.g. `#067553`, also lifts `accent` on `bg` from 4.6:1), lower `accent-soft` to 8% in light, or use `text` for the active label. Change `docs/design.md` first (`design-tokens.test.ts` compares it with the CSS). Found in the 001 validation; accepted for now by the owner | Impact: low | Spec: none
