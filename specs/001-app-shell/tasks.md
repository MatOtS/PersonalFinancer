# Tasks 001: App shell and theme

- [x] **T1. Design tokens and base styles.** FR-23, FR-31
  - Tokens of `docs/design.md` for both themes in `globals.css` (`light-dark()`, `color-scheme`, `:root[data-theme]` overrides, exposed through Tailwind `@theme`), Manrope with `tabular-nums` utility, focus ring, reduced motion. Delete `src/domain/example.test.ts`.
  - Done when: the placeholder page renders with `bg`, `text` and Manrope; forcing `data-theme="dark"` / `"light"` in DevTools switches every color; `npm run check` green.
- [ ] **T2. Theme preference on the server.** FR-29, FR-31, FR-32, edge case
  - `parseThemePreference` with unit tests; root layout reads the `theme` cookie and sets `data-theme` (omitted for "Sistema"), `lang="es"`.
  - Done when: unit tests green; with the cookie set to `dark` the HTML returned by the server already has `data-theme="dark"`; without the cookie it has no attribute and the page follows the OS setting.
- [ ] **T3. Base components: button, segmented control, empty state.** FR-14, FR-27, FR-28
  - `button` (primary, secondary, ghost, destructive), `segmented-control` (native radios styled as pills), `empty-state` (icon tile, text, optional action), all with tokens only.
  - Done when: each component renders correctly in light and dark on a temporary page (removed after checking), keyboard focus is visible, and the segmented control moves with arrow keys.
- [ ] **T4. Theme control.** FR-28, FR-29, FR-30
  - Client component using the segmented control: "Sistema", "Claro", "Oscuro"; on change updates `data-theme` and the cookie, no reload.
  - Done when: picking each option changes the theme instantly, the cookie holds the right value (or is deleted for "Sistema"), and a reload keeps the choice without a flash.
- [ ] **T5. Shell and Home.** FR-23, FR-24, FR-25, FR-27
  - Install `@phosphor-icons/react` (ADR-15 in `docs/architecture.md`); `(app)` route group with layout, sidebar (brand, nav, footer with the theme control), nav item with active state; Home with the exact texts and empty state; delete `src/app/page.tsx`.
  - Done when: `/` shows Home inside the shell with "Inicio" active, the exact Spanish texts, no figures, and the theme control at the bottom of the sidebar.
- [ ] **T6. Not-found inside the shell.** FR-14
  - Catch-all `(app)/[...missing]` calling `notFound()` and `(app)/not-found.tsx`.
  - Done when: `/cualquier-cosa` shows "Página no encontrada" with the sidebar visible, returns status 404, and "Volver a Inicio" goes to `/`.
- [ ] **T7. Security policy with nonce.** NFR security
  - `buildContentSecurityPolicy` with unit tests; `src/proxy.ts` with nonce and CSP (matcher from the Next guide); static headers in `next.config.ts`; ADR-16 (theme cookie) in `docs/architecture.md`.
  - Done when: unit tests green; every page response carries the CSP with a fresh nonce; Home and not-found load with zero CSP violations in the console, in `npm run dev` and in `npm run build && npm start`.
- [ ] **T8. Browser tests and visual check.** FR-14, FR-23 to FR-25, FR-27 to FR-32, NFR security and accessibility
  - Install `@playwright/test`, `playwright.config.ts`, `test:e2e` script; `tests/e2e/shell.spec.ts` and `tests/e2e/theme.spec.ts` as listed in the plan; visual check with the Chrome DevTools MCP at 1280 px in light and dark.
  - Done when: `npm run test:e2e` green, `npm run check` green, and the visual check of Home and not-found in both themes shows no deviations from `docs/design.md`.

Rules: 20 to 30 min max per task, in dependency order, 10 tasks max. Every FR covered by at least one task.
