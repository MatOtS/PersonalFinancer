# Map 001: App shell and theme

Spec: `work/001-app-shell/spec.md`

## Explored context
The visual system from `docs/design.md` becomes CSS tokens for both themes plus a handful of hand-written components; the shell (sidebar, Home, not-found inside the shell) is a route group every later page lives in. The theme lives in a cookie read on the server, so the first paint already has the right theme without any script. `src/proxy.ts` starts here with the per-request nonce and the security policy; `002-access` adds the session check to it.

**Logic.** `parseThemePreference(raw: string | undefined): "system" | "light" | "dark"`: `"light"` and `"dark"` pass; anything else, including undefined, is `"system"`. `buildContentSecurityPolicy(nonce: string, isDev: boolean): string`: scripts and styles only with the nonce or from the app itself, `'strict-dynamic'`, `'unsafe-eval'` only in development, `frame-ancestors 'none'`, `upgrade-insecure-requests` only outside development.

**Algorithm.** Proxy, for every request except static assets and prefetches: make a random base64 nonce, build the policy, forward the request with `x-nonce` and `Content-Security-Policy`, and set the policy on the response. Theme change (client): option "system" removes `data-theme` from `<html>` and deletes the cookie; otherwise it sets `data-theme` and writes `theme=<option>` (1 year, Path=/, SameSite=Lax). Root layout (server): `data-theme` = `parseThemePreference(cookie)` unless it is "system", in which case the attribute is omitted and CSS follows `prefers-color-scheme`.

**UI.** Shell: sidebar 240 px fixed on `surface` with `border` on the right; brand on top; navigation with "Inicio" (house icon), active with `accent-soft` and `accent`; footer with the theme control; content on `bg`, max width 1280 px. Home: `h1`, greeting in `text-muted`, card with the empty state. Not found: `h1`, short text, secondary button "Volver a Inicio". Theme control: three native radios styled as a segmented control; arrow keys move between options. Tokens: CSS custom properties with `light-dark()` and `color-scheme`, overridden by `:root[data-theme]`, exposed to Tailwind through `@theme`. Icons from Phosphor, regular weight, 20 px.

**Planned tests.** Unit: `parseThemePreference`, `buildContentSecurityPolicy`. Browser: Home inside the shell; unknown address inside the shell with a working link; the three theme options, immediate change, cookie, reload keeps it and server HTML carries `data-theme`; "Sistema" follows the emulated scheme (also a change while open); blocked cookies; theme from the root layout; CSP header with nonce and zero violations on Home and not-found; keyboard-only flow. Visual check at 1280 px, light and dark.

## Change map
| File | Action | Functions and signatures | Scenarios |
|---|---|---|---|
| `src/domain/theme.ts` (+ test) | create | `parseThemePreference` | The theme control offers three options; The chosen theme is on the first paint; Blocked cookies fall back to Sistema |
| `src/lib/security-headers.ts` (+ test) | create | `buildContentSecurityPolicy` | (non-functional: security) |
| `src/proxy.ts` | create | `proxy(request)` | (non-functional: security) |
| `next.config.ts` | modify | static security headers | (non-functional: security) |
| `src/app/globals.css` | modify | design tokens for both themes, base styles, focus ring, reduced motion | Pages live inside the shell; Sistema follows the operating system; The chosen theme is on the first paint; The theme applies to every page |
| `src/app/layout.tsx` | modify | read the theme cookie, set `data-theme`, `lang="es"` | Sistema follows the operating system; The chosen theme is on the first paint; The theme applies to every page; Blocked cookies fall back to Sistema |
| `src/app/page.tsx` | delete | replaced by Home inside the app group | Home shows the welcome and an empty state |
| `src/app/(app)/layout.tsx` | create | shell with sidebar and content area | Pages live inside the shell |
| `src/app/(app)/page.tsx` | create | Home | Home shows the welcome and an empty state |
| `src/app/(app)/[...missing]/page.tsx` | create | catch-all that calls `notFound()` | An unknown address shows the not-found page inside the shell |
| `src/app/(app)/not-found.tsx` | create | "Página no encontrada" inside the shell | An unknown address shows the not-found page inside the shell |
| `src/components/ui/button.tsx` | create | button variants from `docs/design.md` | An unknown address shows the not-found page inside the shell |
| `src/components/ui/segmented-control.tsx` | create | accessible radio group styled as pills | The theme control offers three options |
| `src/components/ui/empty-state.tsx` | create | icon, text, optional action | Home shows the welcome and an empty state |
| `src/components/shell/sidebar.tsx` | create | brand, navigation, footer slot | Pages live inside the shell; The sidebar lists only the sections that exist; The current section is marked active |
| `src/components/shell/nav-item.tsx` | create | link with active state | The sidebar lists only the sections that exist; The current section is marked active |
| `src/components/shell/theme-control.tsx` | create | theme segmented control (client) | The theme control offers three options; Sistema follows the operating system; Picking a theme applies it immediately; The chosen theme is remembered |
| `playwright.config.ts`, `tests/e2e/shell.spec.ts`, `tests/e2e/theme.spec.ts` | create | browser tests | all |
| `package.json` | modify | `@phosphor-icons/react`, `@playwright/test`, `test:e2e` script | - |
| `src/domain/example.test.ts` | delete | foundation placeholder | - |
| `docs/architecture.md` | modify | ADR-15 (icons), ADR-16 (theme cookie) | - |

## Slices
Done in dependency order.
- [x] **S1. Design tokens and base styles.** Scenarios: Pages live inside the shell; The chosen theme is on the first paint. Files: `globals.css`.
  - Done when: the placeholder page renders with `bg`, `text` and Manrope; forcing `data-theme="dark"` or `"light"` switches every color; `npm run check` green.
- [x] **S2. Theme preference on the server.** Scenarios: Sistema follows the operating system; The chosen theme is on the first paint; The theme applies to every page; Blocked cookies fall back to Sistema. Files: `theme.ts` (+ test), `layout.tsx`.
  - Done when: unit tests green; with the cookie set to `dark` the server HTML already has `data-theme="dark"`; without the cookie it has no attribute.
- [x] **S3. Base components: button, segmented control, empty state.** Scenarios: An unknown address shows the not-found page inside the shell; Home shows the welcome and an empty state; The theme control offers three options. Files: `button.tsx`, `segmented-control.tsx`, `empty-state.tsx`.
  - Done when: each renders correctly in light and dark, keyboard focus is visible, and the segmented control moves with arrow keys.
- [x] **S4. Theme control.** Scenarios: The theme control offers three options; Sistema follows the operating system; Picking a theme applies it immediately; The chosen theme is remembered. Files: `theme-control.tsx`.
  - Done when: each option changes the theme instantly, the cookie holds the right value (or is deleted for "Sistema"), and a reload keeps the choice without a flash.
- [x] **S5. Shell and Home.** Scenarios: Pages live inside the shell; The sidebar lists only the sections that exist; The current section is marked active; Home shows the welcome and an empty state. Files: `(app)/layout.tsx`, `(app)/page.tsx`, `sidebar.tsx`, `nav-item.tsx`, ADR-15.
  - Done when: `/` shows Home inside the shell with "Inicio" active, the exact Spanish texts, no figures, and the theme control at the bottom of the sidebar.
- [x] **S6. Not-found inside the shell.** Scenarios: An unknown address shows the not-found page inside the shell. Files: `(app)/[...missing]/page.tsx`, `(app)/not-found.tsx`.
  - Done when: `/cualquier-cosa` shows "Página no encontrada" with the sidebar visible, status 404, and "Volver a Inicio" goes to `/`.
- [x] **S7. Security policy with nonce.** Scenarios: (non-functional: security). Files: `security-headers.ts` (+ test), `proxy.ts`, `next.config.ts`, ADR-16.
  - Done when: unit tests green; every page response carries the policy with a fresh nonce; Home and not-found load with zero violations in `npm run dev` and in `npm run build && npm start`.
- [x] **S8. Browser tests and visual check.** Scenarios: all. Files: `playwright.config.ts`, `shell.spec.ts`, `theme.spec.ts`.
  - Done when: `npm run test:e2e` green, `npm run check` green, and the visual check of Home and not-found in both themes shows no deviations from `docs/design.md`.

## Data
None: no tables, no migrations. The theme preference is the cookie `theme` (`light` or `dark`; absent means system), `Path=/`, `SameSite=Lax`, one year; not `HttpOnly` (the client writes it) and not sensitive.

## Decisions
| Decision | Discarded alternative | Reason |
|---|---|---|
| Theme in a cookie read by the server (ADR-16) | `localStorage` plus an inline script before paint | No inline script to allow in the policy, and the first paint is already correct. If cookies are blocked the theme stays on "Sistema". |
| Native radio inputs for the theme control | Base UI RadioGroup / ToggleGroup | Native radios already give keyboard and screen reader behaviour; no dependency needed yet (principle 1). |
| Catch-all `(app)/[...missing]` calling `notFound()` | Root `app/not-found.tsx` | The root not-found renders outside the shell; the scenario asks for it inside the layout. |
| Strict policy with nonce for scripts and styles | `style-src 'unsafe-inline'` (legacy) | Legacy needed it only for Recharts; there are no charts yet. Revisit in the dashboard work item. |
| Phosphor Icons (ADR-15) | Hand-drawn SVGs | Consistent set already chosen in the architecture; tree-shaken per icon. |
| Playwright now | Manual browser checks only | Principle 4 and ADR-08; the theme and shell behaviour are browser behaviour. |

## Risks
- **Next 16 APIs differ from training data** (`proxy.ts`, cookies, route groups). Mitigation: read the bundled guide before each file.
- **The policy with nonce breaks something silently** (fonts, Next runtime, dev overlay). Mitigation: console check for violations in the tests; `'unsafe-eval'` only in development.
- **Reading the theme cookie makes every page dynamic.** Accepted: the nonce already requires dynamic rendering.
